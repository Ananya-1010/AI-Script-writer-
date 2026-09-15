import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

/**
 * Real MongoDB, stubbed provider, no network (spec 13.1).
 *
 * A real mongod rather than a mocked Mongoose matters here: the invariants
 * being tested are query-shaped. Tenant isolation, unique indexes and upsert
 * semantics are enforced by the database, so mocking it would test the mock.
 */

let mongod

export async function startTestDb () {
  process.env.JWT_SECRET ??= 'test-secret-not-used-anywhere-real'
  process.env.AI_SERVICE_URL ??= 'http://localhost:9'
  process.env.AI_SERVICE_TOKEN ??= 'test-service-token'

  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()

  await mongoose.connect(process.env.MONGODB_URI)
  // Indexes are what enforce the unique-email guarantee, so the suite waits for
  // them rather than racing the first insert.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()))
}

export async function stopTestDb () {
  await mongoose.disconnect()
  await mongod?.stop()
}

export async function clearTestDb () {
  const { collections } = mongoose.connection
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})))
}
