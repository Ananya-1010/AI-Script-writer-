import mongoose from 'mongoose'
import { config, assertConfig } from './config/index.js'
import { createApp } from './app.js'
import { logger } from './utils/logger.js'
// Registering every model at boot means indexes are built once, here, rather
// than lazily on first query.
import './models/index.js'

async function main () {
  assertConfig()

  await mongoose.connect(config.mongoUri)
  logger.info('mongo_connected', { db: mongoose.connection.name })

  const app = createApp()
  const server = app.listen(config.port, () => {
    logger.info('server_listening', { port: config.port, env: config.env })
  })

  const shutdown = async (signal) => {
    logger.info('shutdown', { signal })
    server.close()
    await mongoose.disconnect()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  logger.error('boot_failed', { reason: err.message })
  process.exit(1)
})
