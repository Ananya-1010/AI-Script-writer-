import { useEffect, useState } from 'react'
import { api } from './api/client.js'

/**
 * W1 placeholder. Its only job right now is to prove the chain the whole product
 * depends on: browser -> Node -> MongoDB, and Node -> AI service.
 * Real screens land from W5 (spec 5.5).
 */
export default function App () {
  const [ready, setReady] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/health/ready').then(setReady).catch(setError)
  }, [])

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-app">AI Script Writer</h1>
      <p className="mt-1 text-slate-600">
        Turn your idea into a script that fits your platform, audience, purpose, and voice.
      </p>

      <section className="mt-8 rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Service health
        </h2>

        {!ready && !error && <p className="mt-2 text-slate-500">Checking…</p>}

        {error && (
          <p className="mt-2 text-danger">
            {error.message} <span className="text-slate-400">({error.code})</span>
          </p>
        )}

        {ready && (
          <dl className="mt-2 space-y-1 text-sm">
            <Row label="Application API" value={ready.status} />
            <Row label="MongoDB" value={ready.dependencies.mongodb} />
            <Row label="AI service" value={ready.dependencies.aiService.reachable ? 'reachable' : 'unreachable'} />
          </dl>
        )}
      </section>
    </main>
  )
}

function Row ({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-mono text-slate-900">{value}</dd>
    </div>
  )
}
