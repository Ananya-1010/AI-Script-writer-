import { useState } from 'react'
import { EVALUATION_CRITERIA, scripts as scriptsApi } from '../../api/endpoints.js'
import { Button, Card, ErrorState, inputClass } from '../ui.jsx'

/**
 * Six criteria, each scored 1 to 5, with its definition visible at the point of
 * scoring (spec 8.3). Attached to a specific generation, not to the script in
 * general — a script accumulates several generations and scoring "the script"
 * makes the dataset uninterpretable.
 */
export default function EvaluationPanel ({ scriptId, generationId, onSaved }) {
  const [scores, setScores] = useState({})
  const [humanRating, setHumanRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const complete = EVALUATION_CRITERIA.every((c) => scores[c.key]) && humanRating > 0

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await scriptsApi.saveEvaluation(scriptId, { generationId, scores, humanRating, feedback })
      setSaved(true)
      onSaved?.()
    } catch (err) {
      // A save failure keeps the entered scores on screen; nothing is discarded.
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (saved) {
    return (
      <Card title="Evaluation">
        <p className="text-sm text-slate-600">Scored. This feeds prompt and retrieval changes, nothing else.</p>
      </Card>
    )
  }

  return (
    <Card title="Rate this generation">
      <form onSubmit={submit} className="space-y-4">
        {EVALUATION_CRITERIA.map((criterion) => (
          <div key={criterion.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">{criterion.label}</p>
              <Scale
                name={criterion.key}
                value={scores[criterion.key]}
                onChange={(value) => setScores((s) => ({ ...s, [criterion.key]: value }))}
              />
            </div>
            <p className="text-xs text-slate-500">{criterion.hint}</p>
          </div>
        ))}

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Overall</p>
            <Scale name="humanRating" value={humanRating} onChange={setHumanRating} />
          </div>
        </div>

        <textarea
          rows={2}
          className={inputClass}
          placeholder="What worked, what did not"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          aria-label="Free-text feedback"
        />

        <ErrorState error={error} />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!complete || busy}>Save evaluation</Button>
          {/* All six are required, so the dataset stays comparable across
              generations — say why rather than just disabling the button. */}
          {!complete && <p className="text-xs text-slate-500">All six criteria plus an overall rating.</p>}
        </div>
      </form>
    </Card>
  )
}

function Scale ({ name, value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={name}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} out of 5`}
          onClick={() => onChange(n)}
          className={`h-7 w-7 rounded border text-xs transition ${
            value === n
              ? 'border-app bg-app text-white'
              : 'border-slate-300 text-slate-600 hover:border-slate-400'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
