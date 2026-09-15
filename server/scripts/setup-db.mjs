/**
 * One-shot database setup. Safe to re-run.
 *
 *   cd server && npm run db:setup
 *
 * Creates nothing destructive: it only ensures this project's database, its
 * indexes, and the AI service's chunk collection exist. Other databases on the
 * same server are never read or touched.
 *
 * Indexes are created here rather than left to first use, because several of
 * them enforce correctness rather than speed — the unique index on users.email
 * is the only thing that makes duplicate registration impossible under a race.
 *
 * It lives under server/ because it imports the Mongoose models, so index
 * definitions are never restated in two places.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../../.env') })

const APP_URI = process.env.MONGODB_URI
const AI_DB = process.env.AI_MONGODB_DB || 'ai_script_writer'

if (!APP_URI) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env first.')
  process.exit(1)
}

const tick = (label, detail = '') => console.log(`  ok  ${label.padEnd(22)}${detail}`)

await mongoose.connect(APP_URI, { serverSelectionTimeoutMS: 8000 })

const build = await mongoose.connection.db.admin().command({ buildInfo: 1 })
const edition = build.modules?.length ? build.modules.join(', ') : 'community'
console.log(`\nmongodb ${build.version} (${edition})`)
console.log(`database ${mongoose.connection.name}\n`)

// Importing the models registers their schemas, including every index declared
// alongside them.
await import('../src/models/index.js')

console.log('application collections')
for (const name of mongoose.modelNames()) {
  const model = mongoose.model(name)
  await model.syncIndexes()
  const indexes = await model.collection.indexes()
  tick(model.collection.collectionName, `${indexes.length} indexes`)
}

console.log('\nai service')
const chunks = mongoose.connection.client.db(AI_DB).collection('knowledge_chunks')
await chunks.createIndex({ chunkId: 1 }, { unique: true })
await chunks.createIndex({ documentId: 1 })
await chunks.createIndex({ userId: 1 })
tick('knowledge_chunks', '3 indexes')

/**
 * $vectorSearch is an Atlas-only aggregation stage. Detecting it here means the
 * limitation is reported at setup time, in plain language, instead of surfacing
 * as a confusing RETRIEVAL_FAILED in the middle of a demo.
 */
let atlasSearch = false
try {
  await chunks.aggregate([{
    $vectorSearch: { index: 'probe', path: 'embedding', queryVector: [0, 0], numCandidates: 1, limit: 1 }
  }]).toArray()
  atlasSearch = true
} catch { /* expected on a local server */ }

const recommended = atlasSearch ? 'atlas' : 'mongo-local'
const current = process.env.VECTOR_STORE ?? '(unset)'

console.log(`\nvector search  ${atlasSearch ? 'Atlas Vector Search available' : 'not available here (local mongod)'}`)
console.log(`VECTOR_STORE   recommended: ${recommended}   current: ${current}`)

if (current !== recommended) {
  console.log(`\n  warning: set VECTOR_STORE=${recommended} in .env`)
}

await mongoose.disconnect()
console.log('\ndone. safe to re-run.\n')
