import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springSoft } from '../lib/motion.js'

/**
 * Generation takes seconds, so this screen has to hold attention honestly.
 *
 * Two constraints keep it from becoming theatre:
 *   - The last phase HOLDS rather than completing. A bar that fills to 100% and
 *     then waits is a lie, and everyone has learned to read it as one.
 *   - Retrieval is listed only when retrieval actually ran. Showing a step the
 *     system did not perform is the same lie in a smaller font.
 *
 * It occupies the space the script will occupy, at the script's own measure, so
 * the page does not jump when the draft lands.
 */
const PHASES = [
  { key: 'context', label: 'Reading your brief and profile', ms: 1000 },
  { key: 'retrieval', label: 'Retrieving relevant scripting knowledge', ms: 1200 },
  { key: 'writing', label: 'Writing your script', ms: 15000 },
  { key: 'validating', label: 'Checking structure and length', ms: 1800 }
]

export default function GenerationProgress ({ label = 'Generating your draft', retrievalEnabled = false }) {
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
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={springSoft}
      className="measure py-4"
    >
      <div className="flex items-center gap-3.5">
        {/* A ring that orbits rather than a spinner that whirls. Slower, and it
            reads as a process running instead of a page waiting. */}
        <span aria-hidden="true" className="relative grid h-9 w-9 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full border border-ai/20" />
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-ai"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-ai"
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>

        <div className="min-w-0">
          <p className="text-[15px] font-medium text-content">{label}</p>

          {/* The phase line swaps in place rather than the whole list
              re-rendering, so the eye stays on one spot. */}
          <div className="relative h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.key}
                initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}
                transition={spring}
                className="absolute inset-0 truncate text-sm text-content-tertiary"
              >
                {current.label}…
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">{current.label}</p>

      {/* Phase pips. Width-animated so completing a phase is a movement, not a
          colour change. */}
      <div className="mt-6 flex gap-1.5">
        {visible.map((phase, i) => (
          <motion.span
            key={phase.key}
            animate={{
              flexGrow: i === index ? 2.4 : 1,
              opacity: i <= index ? 1 : 0.28
            }}
            transition={springSoft}
            className={`h-1 rounded-full ${i <= index ? 'bg-gradient-to-r from-ai/60 to-ai' : 'bg-[hsl(var(--text)/0.2)]'}`}
            style={{ flexBasis: 0 }}
          />
        ))}
      </div>

      {/* The shape of what is coming, so the layout does not jump when it does. */}
      <div className="mt-12 space-y-9" aria-hidden="true">
        {[5, 3, 6].map((lines, block) => (
          <div key={block} className="relative space-y-2.5">
            <span className="absolute -left-4 top-1 h-[calc(100%-0.25rem)] w-[3px] rounded-full bg-gradient-to-b from-ai/25 to-transparent sm:-left-6" />
            {Array.from({ length: lines }, (_, line) => (
              <div
                key={line}
                className="h-4 animate-breathe rounded bg-[hsl(var(--text)/0.06)]"
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
        <p className="mt-10 text-xs text-content-tertiary">
          Knowledge retrieval is off, so this draft comes from your brief and profile alone.
        </p>
      )}
    </motion.div>
  )
}
