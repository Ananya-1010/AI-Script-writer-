import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SECTION_LABELS } from '../../api/endpoints.js'
import { Button, formatDuration, countWords } from '../ui.jsx'
import { springSoft, stagger } from '../../lib/motion.js'

/**
 * The script surface.
 *
 * Everything dramatic in this app happens in the chrome. Here the job is the
 * opposite: serif, generous leading, a reading measure, and no boxes. The one
 * piece of motion that earns its place is the arrival — sections rise in one
 * after another in reading order, which turns "the response loaded" into "the
 * draft is being laid down". After that it is a document, and it holds still.
 */

const WORDS_PER_MINUTE = 150

const sectionIn = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springSoft }
}

export default function ScriptEditor ({
  script, sections, requestedDuration, onEdit, onImproveSection, busy
}) {
  if (!script?.sections?.length) return null

  /**
   * Measured from the words on screen, never from the model's own
   * estimatedDurationSeconds — the model reports the duration it was asked for,
   * not the one it wrote. Measuring here also means it moves as the creator
   * edits, which is the entire reason to show it.
   */
  const words = sections.reduce((total, section) => total + countWords(section.body), 0)
  const estimated = Math.round((words / WORDS_PER_MINUTE) * 60)
  const ratio = requestedDuration ? estimated / requestedDuration : 1
  const drifting = ratio < 0.6 || ratio > 1.4

  return (
    <article>
      <motion.header
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
        className="mb-12"
      >
        <h1 className="display measure text-[clamp(2rem,3.4vw,2.75rem)] text-content">{script.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-content-tertiary">
          <span title={`${words} words at ${WORDS_PER_MINUTE} words per minute`}>
            <span className="tabular-nums text-content-secondary">{words}</span> words
            <span className="mx-1.5 text-content-faint">·</span>
            ~{formatDuration(estimated)} spoken
          </span>
          {requestedDuration && (
            <>
              <span aria-hidden="true" className="text-content-faint">·</span>
              <span className={drifting ? 'text-warn' : undefined}>
                {formatDuration(requestedDuration)} asked for
                {drifting && (estimated < requestedDuration ? ' — running short' : ' — running long')}
              </span>
            </>
          )}
        </div>

        {/* Drift as a magnitude: read faster than a sentence, and it moves
            while the creator edits. */}
        {requestedDuration && (
          <div className="mt-4 h-1 w-full max-w-sm overflow-hidden rounded-full bg-[hsl(var(--text)/0.07)]">
            <motion.div
              animate={{ scaleX: Math.min(ratio, 1.6) / 1.6 }}
              transition={{ type: 'spring', stiffness: 110, damping: 22 }}
              style={{ transformOrigin: 'left' }}
              className={`h-full rounded-full bg-gradient-to-r ${drifting ? 'from-warn/60 to-warn' : 'from-ai/50 to-ai'}`}
            />
          </div>
        )}
      </motion.header>

      {/* Keyed on the title so a regeneration replays the arrival — a new draft
          should feel like it landed, not like text was swapped underneath. */}
      <motion.div
        key={script.title}
        initial="hidden" animate="show" variants={stagger(0.07, 0.05)}
        className="space-y-10"
      >
        {sections.map((section) => (
          <Section
            key={section.order}
            section={section}
            onEdit={onEdit}
            onImprove={onImproveSection}
            busy={busy}
          />
        ))}
      </motion.div>
    </article>
  )
}

/** "Transition One" under a TRANSITION label says nothing the label did not. */
function meaningfulHeading (heading, kind, kindLabel) {
  const normalise = (s) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
  const h = normalise(heading)
  if (!h) return null
  return h.startsWith(normalise(kindLabel)) || h.startsWith(normalise(kind)) ? null : heading
}

function Section ({ section, onEdit, onImprove, busy }) {
  const ref = useRef(null)
  const isCreator = section.authoredBy === 'creator'
  const kindLabel = SECTION_LABELS[section.kind] ?? section.kind
  const heading = meaningfulHeading(section.heading, section.kind, kindLabel)

  // Grow to content. A scrollbar inside a paragraph breaks the illusion that
  // this is a document rather than a form.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [section.body])

  return (
    <motion.section variants={sectionIn} className="group relative">
      {/* The authorship rule. A gradient so it has depth rather than reading as
          a printed line, and it brightens when the section has focus. */}
      <span
        aria-hidden="true"
        className={`absolute -left-4 top-1 h-[calc(100%-0.25rem)] w-[3px] rounded-full bg-gradient-to-b transition-opacity duration-500 sm:-left-6 ${
          isCreator
            ? 'from-creator to-creator/25 opacity-90'
            : 'from-ai to-ai/20 opacity-45 group-hover:opacity-80 group-focus-within:opacity-100'
        }`}
      />

      <div className="measure mb-2.5 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-content-tertiary">{kindLabel}</span>
        {heading && <span className="truncate text-xs text-content-faint">{heading}</span>}

        <span className={`text-[11px] ${isCreator ? 'text-creator' : 'text-ai'}`}>
          {isCreator ? 'your words' : 'AI draft'}
        </span>

        <span className="ml-auto flex items-center gap-1.5">
          {section.kind === 'hook' && (
            <Button
              size="sm" variant="glass" disabled={busy}
              onClick={() => onImprove('improve_hook')}
              className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              Improve hook
            </Button>
          )}
          <span className="text-[11px] tabular-nums text-content-faint opacity-0 transition-opacity group-hover:opacity-100">
            {countWords(section.body)}w
          </span>
        </span>
      </div>

      <label className="sr-only" htmlFor={`section-${section.order}`}>{kindLabel} body</label>
      <textarea
        ref={ref}
        id={`section-${section.order}`}
        value={section.body}
        onChange={(event) => onEdit(section.order, event.target.value)}
        rows={1}
        spellCheck
        className="prose-script measure w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-content outline-none focus:ring-0"
      />
    </motion.section>
  )
}
