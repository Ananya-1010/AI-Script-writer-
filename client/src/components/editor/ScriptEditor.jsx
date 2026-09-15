import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SECTION_LABELS } from '../../api/endpoints.js'
import { Button, formatDuration, countWords } from '../ui.jsx'
import { springSoft, stagger } from '../../lib/motion.js'

/**
 * The manuscript.
 *
 * Set in Newsreader at a reading measure on warm stock. No boxes, no fills —
 * a section is a marginal rule, a label in the margin, and text.
 *
 * The authorship rule is the product's core promise rendered as pigment:
 * GRAPHITE for what the model drafted, the RED PENCIL for anything you have
 * touched. Once a line is yours it stays marked for the life of the script.
 *
 * The one piece of motion that earns its place is the arrival — sections set
 * themselves in reading order, which turns "the response loaded" into "the
 * draft is being laid down". After that it is a document, and it holds still.
 */

const WORDS_PER_MINUTE = 150

const sectionIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springSoft }
}

export default function ScriptEditor ({
  script, sections, requestedDuration, onEdit, onImproveSection, busy
}) {
  if (!script?.sections?.length) return null

  /**
   * Measured from the words on screen, never from the model's own
   * estimatedDurationSeconds — the model reports the duration it was asked for,
   * not the one it wrote. Measuring here also means it moves as you edit, which
   * is the entire reason to show it.
   */
  const words = sections.reduce((total, section) => total + countWords(section.body), 0)
  const estimated = Math.round((words / WORDS_PER_MINUTE) * 60)
  const ratio = requestedDuration ? estimated / requestedDuration : 1
  const drifting = ratio < 0.6 || ratio > 1.4

  return (
    <article>
      <motion.header
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
        className="mb-14"
      >
        <h1 className="display measure text-[clamp(2.2rem,4.2vw,3.2rem)] text-ink">{script.title}</h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-4 text-xs text-ink-tertiary">
          <span title={`${words} words at ${WORDS_PER_MINUTE} words per minute`}>
            <span className="tabular-nums text-ink-secondary">{words}</span> words
          </span>
          <span aria-hidden="true">·</span>
          <span>~{formatDuration(estimated)} spoken</span>
          {requestedDuration && (
            <>
              <span aria-hidden="true">·</span>
              <span className={drifting ? 'text-ochre' : undefined}>
                {formatDuration(requestedDuration)} asked for
                {drifting && (estimated < requestedDuration ? ' — running short' : ' — running long')}
              </span>
            </>
          )}
        </div>
      </motion.header>

      {/* Keyed on the title so a regeneration replays the arrival — a new draft
          should feel like it landed, not like text was swapped underneath. */}
      <motion.div
        key={script.title}
        initial="hidden" animate="show" variants={stagger(0.07, 0.05)}
        className="space-y-12"
      >
        {sections.map((section) => (
          <Section key={section.order} section={section} onEdit={onEdit} onImprove={onImproveSection} busy={busy} />
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
    <motion.section variants={sectionIn} className="group relative pl-5 sm:pl-7">
      {/* The margin rule. Red pencil once you have touched it. */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1.5 h-[calc(100%-0.5rem)] w-[3px] transition-colors duration-DEFAULT ${
          isCreator ? 'bg-pencil' : 'bg-graphite/40 group-focus-within:bg-graphite'
        }`}
      />

      <div className="measure mb-3 flex items-center gap-3">
        <span className="label text-ink-tertiary">{kindLabel}</span>
        {heading && <span className="truncate text-xs text-ink-faint">{heading}</span>}

        <span className={`label ${isCreator ? 'text-pencil' : 'text-graphite'}`}>
          {isCreator ? 'yours' : 'model'}
        </span>

        <span className="ml-auto flex items-center gap-3">
          {section.kind === 'hook' && (
            <Button
              size="sm" variant="quiet" disabled={busy}
              onClick={() => onImprove('improve_hook')}
              className="!px-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              Improve hook
            </Button>
          )}
          <span className="text-micro tabular-nums tracking-normal text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
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
        className="prose-script measure w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-ink outline-none focus:ring-0"
      />
    </motion.section>
  )
}
