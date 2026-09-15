import { useRef, useEffect } from 'react'
import { SECTION_LABELS } from '../../api/endpoints.js'
import { Button, formatDuration, countWords } from '../ui.jsx'

/**
 * The script is the page (spec 8.5).
 *
 * Everything here follows from that one sentence:
 *   - Serif, 18px, 1.72 leading, capped at a ~68 character measure. This is the
 *     only surface in the app allowed to be typographically generous.
 *   - No cards, no borders around sections. A section is a left rule, a quiet
 *     label, and text. Boxes would make the script look like a form.
 *   - Section controls appear on hover and focus, not permanently. Chrome that
 *     is always visible competes with the words for attention.
 *   - Textareas grow to their content. A scrollbar inside a paragraph breaks
 *     the illusion that this is a document.
 */

const WORDS_PER_MINUTE = 150

export default function ScriptEditor ({
  script, sections, requestedDuration, onEdit, onImproveSection, busy
}) {
  if (!script?.sections?.length) return null

  /**
   * Measured from the text on screen, never from the model's own
   * estimatedDurationSeconds — the model reports the duration it was asked for,
   * not the one it wrote. Measuring here also means the number moves as the
   * creator edits, which is the entire reason to show it.
   */
  const words = sections.reduce((total, section) => total + countWords(section.body), 0)
  const estimated = Math.round((words / WORDS_PER_MINUTE) * 60)
  const ratio = requestedDuration ? estimated / requestedDuration : 1
  const drifting = ratio < 0.6 || ratio > 1.4

  return (
    <article className="animate-in">
      <header className="mb-10">
        <h1 className="font-serif text-3xl text-content measure">{script.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-tertiary">
          <span title={`${words} words at ${WORDS_PER_MINUTE} words per minute`}>
            {words} words · ~{formatDuration(estimated)} spoken
          </span>
          {requestedDuration && (
            <>
              <span aria-hidden="true">·</span>
              <span className={drifting ? 'text-warn' : undefined}>
                {formatDuration(requestedDuration)} requested
                {drifting && (estimated < requestedDuration ? ' — running short' : ' — running long')}
              </span>
            </>
          )}
        </div>

        {/* Length as a bar rather than a sentence: drift is a magnitude, and a
            magnitude is read faster than it is parsed. */}
        {requestedDuration && (
          <div className="mt-3 h-[3px] w-full max-w-sm overflow-hidden rounded-full bg-surface-sunken" role="presentation">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${drifting ? 'bg-warn' : 'bg-ai'}`}
              style={{ width: `${Math.min(ratio, 1.6) / 1.6 * 100}%` }}
            />
          </div>
        )}
      </header>

      <div className="space-y-9">
        {sections.map((section) => (
          <Section
            key={section.order}
            section={section}
            onEdit={onEdit}
            onImprove={onImproveSection}
            busy={busy}
          />
        ))}
      </div>
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

  // Grow to content. Re-run on every change so the box never scrolls.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [section.body])

  return (
    <section
      className={`group relative -ml-4 border-l-2 pl-4 transition-colors ease-out sm:-ml-6 sm:pl-6 ${
        isCreator ? 'border-creator' : 'border-ai/35 hover:border-ai/70'
      }`}
    >
      {/* Constrained to the measure so the controls land at the right edge of
          the text rather than floating in the gutter beside it. */}
      <div className="measure mb-2 flex items-center gap-2">
        <span className="text-micro font-medium uppercase tracking-[0.08em] text-content-tertiary">
          {kindLabel}
        </span>

        {/* The model often names a section after its own kind — "Hook" under
            HOOK, "Transition One" under TRANSITION. Printing both is noise, so
            the heading only shows when it actually says something new. */}
        {heading && (
          <span className="truncate text-xs text-content-faint">{heading}</span>
        )}

        {/* Authorship: colour on the rule, plus a word. Never colour alone. */}
        <span className={`text-micro ${isCreator ? 'text-creator' : 'text-ai'}`}>
          {isCreator ? 'your words' : 'AI draft'}
        </span>

        <span className="ml-auto flex items-center gap-1">
          {/* Revealed on hover, and on keyboard focus so it is not
              mouse-only — but always in the DOM, so it is never announced as
              appearing and disappearing. */}
          {section.kind === 'hook' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onImprove('improve_hook')}
              className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              Improve hook
            </Button>
          )}
          <span className="text-micro tabular-nums text-content-faint opacity-0 transition-opacity group-hover:opacity-100">
            {countWords(section.body)}w
          </span>
        </span>
      </div>

      <label className="sr-only" htmlFor={`section-${section.order}`}>
        {kindLabel} body
      </label>
      <textarea
        ref={ref}
        id={`section-${section.order}`}
        value={section.body}
        onChange={(event) => onEdit(section.order, event.target.value)}
        rows={1}
        spellCheck
        className="prose-script measure w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-content outline-none focus:ring-0"
      />
    </section>
  )
}
