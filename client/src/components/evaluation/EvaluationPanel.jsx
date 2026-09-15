import { useState } from 'react'
import { EVALUATION_CRITERIA, scripts as scriptsApi } from '../../api/endpoints.js'
import { Button, ErrorState, inputClass } from '../ui.jsx'

/**
 * Six criteria, each with its definition visible at the point of scoring
 * (spec 8.3), attached to one generation rather than to the script.
 *
 * It lives in the rail at rail scale, because rating is a deliberate act that
 * happens after reading — not something that should compete with the script
 * while the creator is still reading it.
 */
export default function EvaluationPanel ({ scriptId, generationId, onSaved }) {
  const [scores, setScores] = useState({})
  const [humanRating, setHumanRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  // Seven, not six: the overall rating is required too, and a counter that
  // reads 6/6 next to a disabled button is just confusing.
  const total = EVALUATION_CRITERIA.length + 1
  const done = EVALUATION_CRITERIA.filter((c) => scores[c.key]).length + (humanRating ? 1 : 0)
  const complete = done === total

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setError(null)
    try {
      await scriptsApi.saveEvaluation(scriptId, { generationId, scores, humanRating, feedback })
      setSaved(true)
      onSaved?.()
    } catch (err) {
      // A failed save keeps every score on screen. Nothing is discarded.
      setError(err)
    } finally { setBusy(false) }
  }

  if (saved) {
    return (
      <section>
        <h2 className="mb-2 text-micro font-medium uppercase tracking-[0.08em] text-ink-tertiary">Rated</h2>
        <p className="text-xs leading-relaxed text-ink-tertiary">
          Scored. This feeds prompt and retrieval changes — nothing else.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-micro font-medium uppercase tracking-[0.08em] text-ink-tertiary">
          Rate this draft
        </h2>
        <span className="text-micro tabular-nums text-ink-faint">{done}/{total}</span>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {EVALUATION_CRITERIA.map((criterion) => (
          <div key={criterion.key}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-secondary" title={criterion.hint}>
                {criterion.label}
              </span>
              <Scale
                label={criterion.label}
                value={scores[criterion.key]}
                onChange={(value) => setScores((s) => ({ ...s, [criterion.key]: value }))}
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between gap-2 border-t border-rule pt-3">
          <span className="text-xs font-medium text-ink">Overall</span>
          <Scale label="Overall" value={humanRating} onChange={setHumanRating} />
        </div>

        <textarea
          rows={2}
          className={`${inputClass} text-xs`}
          placeholder="What worked, what did not"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          aria-label="Free-text feedback"
        />

        <ErrorState error={error} />

        <Button type="submit" size="sm" variant={complete ? 'primary' : 'secondary'} disabled={!complete || busy} className="w-full">
          {busy ? 'Saving…' : complete ? 'Save rating' : 'Score all seven to save'}
        </Button>
      </form>
    </section>
  )
}

/**
 * Five dots, not five numbered buttons. At rail scale the number is unreadable
 * anyway; position carries the value, and the accessible name carries it for
 * anyone who cannot see position.
 */
function Scale ({ label, value, onChange }) {
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} out of 5`}
          onClick={() => onChange(n)}
          className="group grid h-5 w-4 place-items-center"
        >
          {/* Unfilled is an outlined slot, not a faint fill. A dim filled dot
              disappears against either theme, and the whole control reads as
              missing — an outline says "empty, and pressable" at any contrast. */}
          <span
            className={`h-[9px] w-[9px] rounded-full border transition-all ease-out ${
              value >= n
                ? 'border-brass bg-brass'
                : 'border-rule-strong bg-transparent group-hover:border-content-tertiary group-hover:scale-110'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
