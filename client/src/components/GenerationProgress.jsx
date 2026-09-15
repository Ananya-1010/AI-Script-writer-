import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springSoft } from '../lib/motion.js'

/**
 * Generation takes seconds, so this has to hold attention honestly.
 *
 * Two constraints keep it from being theatre:
 *   - The last phase HOLDS rather than completing. A bar that fills to 100% and
 *     then waits is a lie everyone has learned to read.
 *   - Retrieval is listed only when retrieval actually ran. Showing a step the
 *     system did not perform is the same lie in a smaller font.
 *
 * It occupies the space the script will occupy, at the script's measure, so the
 * page does not jump when the draft lands.
 */
const PHASES = [
  { key: 'context', label: 'Reading your brief and profile', ms: 1000 },
  { key: 'retrieval', label: 'Retrieving relevant scripting knowledge', ms: 1200 },
  { key: 'writing', label: 'Writing your script', ms: 15000 },
  { key: 'validating', label: 'Checking structure and length', ms: 1800 }
]

export default function GenerationProgress ({ label = 'Setting your draft', retrievalEnabled = false }) {
  const [index, setIndex] = useState(0)
  const visible = PHASES.filter((p) => p.key !== 'retrieval' || retrievalEnabled)

  useEffect(() => {
    if (index >= visible.length - 1) return
    const timer = setTimeout(() => setIndex((i) => i + 1), visible[index].ms)
    return () => clearTimeout(timer)
  }, [index, visible.length])

  const current = visible[Math.min(index, visible.length - 1)]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={springSoft}
      className="measure"
    >
      <p className="display text-xl text-ink">{label}</p>

      {/* The phase line swaps in place rather than the list re-rendering, so
          the eye stays on one spot. */}
      <div className="relative mt-2 h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={current.key}
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}
            transition={spring}
            className="absolute inset-0 truncate text-base text-ink-tertiary"
          >
            {current.label}…
          </motion.p>
        </AnimatePresence>
      </div>

      <p aria-live="polite" className="sr-only">{current.label}</p>

      {/* Phase marks along a rule — a print progress bar, not a loading bar. */}
      <div className="mt-8 flex gap-2">
        {visible.map((phase, i) => (
          <motion.span
            key={phase.key}
            animate={{ flexGrow: i === index ? 2.6 : 1, opacity: i <= index ? 1 : 0.25 }}
            transition={springSoft}
            className={`h-[3px] ${i <= index ? 'bg-brass' : 'bg-ink/20'}`}
            style={{ flexBasis: 0 }}
          />
        ))}
      </div>

      {/* The shape of what is coming, so the layout does not jump when it does. */}
      <div className="mt-16 space-y-12" aria-hidden="true">
        {[5, 3, 6].map((lines, block) => (
          <div key={block} className="relative space-y-3 pl-5 sm:pl-7">
            <span className="absolute left-0 top-1.5 h-[calc(100%-0.5rem)] w-[3px] bg-graphite/20" />
            {Array.from({ length: lines }, (_, line) => (
              <div
                key={line}
                className="h-4 animate-breathe bg-ink/8"
                style={{
                  width: line === lines - 1 ? '42%' : `${86 + ((line * 9) % 13)}%`,
                  animationDelay: `${(block * 3 + line) * 110}ms`
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {!retrievalEnabled && (
        <p className="mt-12 border-t border-rule pt-4 text-xs text-ink-tertiary">
          Knowledge retrieval is off, so this draft comes from your brief and profile alone.
        </p>
      )}
    </motion.div>
  )
}
