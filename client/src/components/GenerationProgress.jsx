import { useEffect, useState } from 'react'

/**
 * Phase-level progress, never an anonymous spinner (spec 8.3).
 *
 * Two honesty constraints shape this:
 *   - The last phase holds rather than completing. A bar that fills to 100%
 *     and then waits is a lie, and everyone has learned to read it as one.
 *   - Retrieval is listed only when retrieval actually ran. Showing a step the
 *     system did not perform is the same lie in a smaller font.
 *
 * It renders in the place the script will appear, at the script's own measure,
 * so the page does not jump when the draft lands.
 */
const PHASES = [
  { key: 'context', label: 'Reading your brief and profile', ms: 900 },
  { key: 'retrieval', label: 'Retrieving relevant scripting knowledge', ms: 1100 },
  { key: 'writing', label: 'Writing your script', ms: 14000 },
  { key: 'validating', label: 'Checking structure and length', ms: 1600 }
]

export default function GenerationProgress ({ label = 'Generating your draft', retrievalEnabled = false }) {
  const [index, setIndex] = useState(0)
  const visible = PHASES.filter((p) => p.key !== 'retrieval' || retrievalEnabled)

  useEffect(() => {
    if (index >= visible.length - 1) return
    const timer = setTimeout(() => setIndex((i) => i + 1), visible[index].ms)
    return () => clearTimeout(timer)
  }, [index, visible.length])

  return (
    <div className="animate-in measure py-6">
      <p className="text-sm font-medium text-content">{label}</p>

      {/* One live region for the whole component, so a screen reader hears the
          phase change once rather than hearing the list re-read. */}
      <p aria-live="polite" className="sr-only">{visible[Math.min(index, visible.length - 1)].label}</p>

      <ol className="mt-5 space-y-3">
        {visible.map((phase, i) => {
          const done = i < index
          const active = i === index

          return (
            <li key={phase.key} className="flex items-center gap-3">
              <span aria-hidden="true" className="relative grid h-4 w-4 place-items-center">
                {done ? (
                  <span className="text-ai">✓</span>
                ) : active ? (
                  <>
                    <span className="absolute h-4 w-4 animate-ping rounded-full bg-ai/20" />
                    <span className="h-1.5 w-1.5 rounded-full bg-ai" />
                  </>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-content-faint/40" />
                )}
              </span>

              <span className={`text-sm transition-colors duration-500 ${
                done ? 'text-content-tertiary' : active ? 'text-content' : 'text-content-faint'
              }`}>
                {phase.label}
              </span>
            </li>
          )
        })}
      </ol>

      {/* The shape of what is coming, so the layout does not jump when it does. */}
      <div className="mt-8 space-y-6" aria-hidden="true">
        {[5, 3, 6].map((lines, block) => (
          <div key={block} className="space-y-2 border-l-2 border-ai/15 pl-4">
            {Array.from({ length: lines }, (_, line) => (
              <div
                key={line}
                className="h-3.5 animate-breathe rounded bg-surface-sunken"
                style={{
                  width: line === lines - 1 ? '45%' : `${88 + ((line * 7) % 10)}%`,
                  animationDelay: `${(block * 3 + line) * 90}ms`
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {!retrievalEnabled && (
        <p className="mt-6 text-xs text-content-tertiary">
          Knowledge retrieval is off, so this draft comes from your brief and profile alone.
        </p>
      )}
    </div>
  )
}
