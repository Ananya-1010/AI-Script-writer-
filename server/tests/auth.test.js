import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import { startTestDb, stopTestDb, clearTestDb } from './setup.js'

let app

before(async () => {
  await startTestDb()
  // Imported after the env is set, because config asserts at import time.
  const [{ createApp }] = await Promise.all([import('../src/app.js'), import('../src/models/index.js')])
  app = createApp()
})

after(stopTestDb)
beforeEach(clearTestDb)

const CREDENTIALS = { name: 'Ana Rao', email: 'ana@example.com', password: 'correct horse battery' }

const register = (overrides = {}) =>
  request(app).post('/api/v1/auth/register').send({ ...CREDENTIALS, ...overrides })

test('TEST-001: register then log in, and no response ever contains the password hash', async () => {
  const created = await register()
  assert.equal(created.status, 201)
  assert.ok(created.body.accessToken)
  assert.equal(created.body.user.email, 'ana@example.com')

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: CREDENTIALS.email, password: CREDENTIALS.password })
  assert.equal(login.status, 200)
  assert.ok(login.body.accessToken)

  const me = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
  assert.equal(me.status, 200)
  assert.equal(me.body.hasProfile, false)

  const everything = JSON.stringify([created.body, login.body, me.body])
  assert.ok(!everything.includes('passwordHash'))
  assert.ok(!everything.includes(CREDENTIALS.password))
})

test('a duplicate email is rejected as EMAIL_EXISTS, not VERSION_CONFLICT', async () => {
  await register()
  const second = await register({ name: 'Someone Else' })

  assert.equal(second.status, 409)
  assert.equal(second.body.error.code, 'EMAIL_EXISTS')
})

test('a wrong password and an unknown email are indistinguishable', async () => {
  await register()

  const wrongPassword = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: CREDENTIALS.email, password: 'not the password' })

  const unknownEmail = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'nobody@example.com', password: 'not the password' })

  assert.equal(wrongPassword.status, 401)
  assert.equal(unknownEmail.status, 401)
  // Identical code and message, so the endpoint does not enumerate accounts.
  assert.equal(wrongPassword.body.error.code, unknownEmail.body.error.code)
  assert.equal(wrongPassword.body.error.message, unknownEmail.body.error.message)
})

test('protected routes reject a missing, malformed or forged token', async () => {
  for (const header of [undefined, 'Bearer', 'Basic abc', 'Bearer not.a.jwt']) {
    const response = header
      ? await request(app).get('/api/v1/auth/me').set('Authorization', header)
      : await request(app).get('/api/v1/auth/me')

    assert.equal(response.status, 401, `expected 401 for header: ${header}`)
    assert.equal(response.body.error.code, 'AUTH_ERROR')
  }
})

test('TEST-005-style: an invalid body is rejected at the boundary', async () => {
  const badEmail = await register({ email: 'not-an-email' })
  assert.equal(badEmail.status, 400)
  assert.equal(badEmail.body.error.code, 'VALIDATION_ERROR')

  const shortPassword = await register({ password: 'short' })
  assert.equal(shortPassword.status, 400)
  assert.equal(shortPassword.body.error.code, 'VALIDATION_ERROR')
})

test('every response carries the request and correlation IDs for tracing', async () => {
  const response = await register()

  assert.ok(response.headers['x-request-id'])
  assert.ok(response.headers['x-correlation-id'])
})

test('a client-supplied X-Request-Id is echoed back so one action traces end to end', async () => {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .set('X-Request-Id', 'req_from_client')
    .send(CREDENTIALS)

  assert.equal(response.headers['x-request-id'], 'req_from_client')
})
