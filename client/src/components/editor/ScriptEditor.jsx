import { SECTION_LABELS } from '../../api/endpoints.js'
import { Badge, Button, formatDuration } from '../ui.jsx'

/**
 * The script is the page (spec 8.5). Editor chrome recedes; the script text is
 * the largest, highest-contrast element on screen.
 *
 * Sections are individually editable, never one text blob, and AI-written text
 * is distinguished from creator-written text by a border, a label and a colour —
 * never by colour alone (spec 8.6).
 */
// Matches WORDS_PER_MINUTE in the AI service, so the editor and the automated
// checks cannot disagree about how long a script is.
const WORDS_PER_MINUTE = 150

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length

export default function ScriptEditor ({
  script, sections, requestedDuration, onEdit, onImproveSection, busy
}) {
  if (!script?.sections?.length) return null

  /**
   * Measured from the text on screen, not taken from the model's own
   * estimatedDurationSeconds.
   *
   * Two reasons. The model's self-estimate is routinely wrong — it will claim
   * the duration it was asked for rather than the one it wrote. And a number
   * baked in at generation time cannot show drift while the creator edits,
   * which is the entire point of showing it (spec 8.3).
   */
  const words = sections.reduce((total, section) => total + countWords(section.body), 0)
  const estimated = Math.round((words / WORDS_PER_MINUTE) * 60)
  const drift = requestedDuration ? Math.abs(estimated - requestedDuration) / requestedDuration : 0

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-900">{script.title}</h2>
        <p className="text-sm text-slate-500">
          <span title={`${words} words at ${WORDS_PER_MINUTE} words per minute`}>
            ~{formatDuration(estimated)} as written
          </span>
          {requestedDuration ? ` · ${formatDuration(requestedDuration)} requested` : ''}
          {drift > 0.4 && (
            <span className="ml-2 text-amber-700">
              · {estimated < requestedDuration ? 'shorter' : 'longer'} than you asked for
            </span>
          )}
        </p>
      </header>

      {sections.map((section) => {
        const isCreator = section.authoredBy === 'creator'

        return (
          <article
            key={section.order}
            className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${
              isCreator ? 'border-l-creator border border-violet-200' : 'border-l-ai border border-slate-200'
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="slate">{SECTION_LABELS[section.kind] ?? section.kind}</Badge>
              <span className="text-sm font-medium text-slate-700">{section.heading}</span>

              <Badge tone={isCreator ? 'creator' : 'ai'}>
                {isCreator ? '✎ your words' : '✦ AI draft'}
              </Badge>

              {section.kind === 'hook' && (
                <Button
                  variant="ghost"
                  className="ml-auto !px-2 !py-1 text-xs"
                  disabled={busy}
                  onClick={() => onImproveSection('improve_hook')}
                >
                  Improve this hook
                </Button>
              )}
            </div>

            <label className="sr-only" htmlFor={`section-${section.order}`}>
              {SECTION_LABELS[section.kind] ?? section.kind} body
            </label>
            <textarea
              id={`section-${section.order}`}
              value={section.body}
              onChange={(event) => onEdit(section.order, event.target.value)}
              rows={Math.max(3, Math.ceil(section.body.length / 90))}
              className="w-full resize-y border-0 bg-transparent p-0 text-[15px] leading-relaxed text-slate-900 outline-none focus:ring-0"
            />

            <p className="mt-1 text-xs text-slate-400">
              {section.body.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </article>
        )
      })}
    </div>
  )
}
