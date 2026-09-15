import { useEffect, useState } from 'react'

/**
 * Phase-level progress, not an anonymous spinner (spec 8.3).
 *
 * Generation is genuinely slow, so the honest thing is to say which phase is
 * running. The phases below are the real ones the pipeline reports; the timings
 * are estimates used only to advance the indicator, and the last phase holds
 * until the response actually lands rather than pretending to finish.
 */
const PHASES = [
  { key: 'context', label: 'Reading your brief and profile', ms: 700 },
  { key: 'retrieval', label: 'Retrieving relevant scripting knowledge', ms: 900 },
  { key: 'writing', label: 'Writing your script', ms: 12000 },
  { key: 'validating', label: 'Checking structure and length', ms: 1200 }
]

export default function GenerationProgress ({ label = 'Generating', retrievalEnabled = false }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const visible = PHASES.filter((p) => p.key !== 'retrieval' || retrievalEnabled)
    if (index >= visible.length - 1) return

    const timer = setTimeout(() => setIndex((i) => i + 1), visible[index].ms)
    return () => clearTimeout(timer)
  }, [index, retrievalEnabled])

  const visible = PHASES.filter((p) => p.key !== 'retrieval' || retrievalEnabled)
  const current = visible[Math.min(index, visible.length - 1)]

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
      <p className="text-sm font-medium text-teal-900">{label}</p>

      {/* A live region, so a creator who cannot see the indicator still knows
          what is happening and when the draft arrives (spec 8.6). */}
      <p aria-live="polite" className="mt-1 text-sm text-teal-800">{current.label}…</p>

      <ol className="mt-4 space-y-1.5">
        {visible.map((phase, i) => (
          <li key={phase.key} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                i < index ? 'bg-teal-600' : i === index ? 'animate-pulse bg-teal-600' : 'bg-teal-200'
              }`}
            />
            <span className={i <= index ? 'text-teal-900' : 'text-teal-500'}>{phase.label}</span>
          </li>
        ))}
      </ol>

      {!retrievalEnabled && (
        <p className="mt-3 text-xs text-teal-700">
          Knowledge retrieval is off for now, so this draft comes from your brief and profile alone.
        </p>
      )}
    </div>
  )
}
