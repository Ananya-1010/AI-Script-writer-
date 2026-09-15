import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import { startTestDb, stopTestDb, clearTestDb } from './setup.js'

/**
 * Tenant isolation and profile behaviour.
 *
 * These are the tests that justify the repository layer existing. If isolation
 * were left to each controller, this file would pass today and quietly stop
 * passing the first time someone adds a route in a hurry.
 */

let app
let scopedRepository

before(async () => {
  await startTestDb()
  const [{ createApp }, repos] = await Promise.all([
    import('../src/app.js'),
    import('../src/repositories/index.js'),
    import('../src/models/index.js')
  ])
  app = createApp()
  scopedRepository = repos
})

after(stopTestDb)
beforeEach(clearTestDb)

async function createCreator (email) {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: email, email, password: 'correct horse battery' })
  return response.body.accessToken
}

const PROFILE = {
  niche: 'personal finance for early-career professionals',
  audience: '22-30, first job, India',
  tone: ['direct', 'warm'],
  preferredPlatforms: ['youtube', 'reels'],
  stylePreferences: { prefer: ['concrete numbers'], avoid: ['clickbait openings'] },
  sampleContent: ['Last month I tracked every rupee I spent...']
}

test('GET /profile is 404 before setup, and PUT upserts', async () => {
  const token = await createCreator('ana@example.com')
  const auth = (r) => r.set('Authorization', `Bearer ${token}`)

  const missing = await auth(request(app).get('/api/v1/profile'))
  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, 'NOT_FOUND')

  const saved = await auth(request(app).put('/api/v1/profile')).send(PROFILE)
  assert.equal(saved.status, 200)
  assert.equal(saved.body.profile.niche, PROFILE.niche)

  const fetched = await auth(request(app).get('/api/v1/profile'))
  assert.equal(fetched.status, 200)
  assert.deepEqual(fetched.body.profile.tone, ['direct', 'warm'])

  // Upsert, not insert: saving twice must not create a second profile.
  const updated = await auth(request(app).put('/api/v1/profile')).send({ ...PROFILE, niche: 'changed' })
  assert.equal(updated.body.profile.niche, 'changed')

  const after = await auth(request(app).get('/api/v1/profile'))
  assert.equal(after.body.profile.niche, 'changed')
})

test('one creator cannot read another creator\'s profile', async () => {
  const alice = await createCreator('alice@example.com')
  const bob = await createCreator('bob@example.com')

  await request(app).put('/api/v1/profile').set('Authorization', `Bearer ${alice}`).send(PROFILE)

  const bobsView = await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${bob}`)

  // Bob has no profile of his own and must not inherit Alice's.
  assert.equal(bobsView.status, 404)
})

test('identity comes from the token, never from the request body', async () => {
  const alice = await createCreator('alice@example.com')
  const bob = await createCreator('bob@example.com')

  // Attempt to write into Alice's profile by smuggling a userId in the body.
  const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${alice}`)
  const aliceId = me.body.userId

  await request(app)
    .put('/api/v1/profile')
    .set('Authorization', `Bearer ${bob}`)
    .send({ ...PROFILE, userId: aliceId, niche: 'injected by bob' })

  const aliceProfile = await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${alice}`)

  // Alice still has no profile: Bob's write landed on Bob, and the smuggled
  // userId was stripped by the schema before a controller ever saw it.
  assert.equal(aliceProfile.status, 404)
})

test('a scoped repository refuses to run a query with no userId', async () => {
  // A programming error must fail loudly rather than reading the collection.
  await assert.rejects(
    () => scopedRepository.profileRepository.findOne(undefined),
    /without a userId/
  )
})

test('oversized profile fields are rejected before they can reach a prompt', async () => {
  const token = await createCreator('ana@example.com')

  const response = await request(app)
    .put('/api/v1/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...PROFILE, niche: 'x'.repeat(5000) })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
})
