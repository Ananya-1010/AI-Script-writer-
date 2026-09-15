import { useState } from 'react'
import { PLATFORMS, CONTENT_TYPES } from '../../api/endpoints.js'
import { Button, Field, inputClass, formatDuration } from '../ui.jsx'

/**
 * Everything on one screen, with inline validation, and the generate action
 * disabled with a stated reason until the brief is complete (spec 8.3).
 *
 * Duration options are constrained by the selected platform, so an impossible
 * brief cannot be submitted — and cannot burn a provider call failing.
 */
export default function BriefForm ({ profile, onSubmit, busy }) {
  const defaultPlatform = profile?.preferredPlatforms?.[0] ?? 'youtube'
  const platformMeta = (value) => PLATFORMS.find((p) => p.value === value)

  const [form, setForm] = useState({
    title: '',
    idea: '',
    platform: defaultPlatform,
    contentType: 'educational',
    // Pre-filled from the profile and still editable per script (spec 8.3).
    audience: profile?.audience ?? '',
    objective: '',
    durationSeconds: platformMeta(defaultPlatform)?.default ?? 480
  })

  const meta = platformMeta(form.platform)

  const problems = []
  if (form.title.trim().length < 1) problems.push('a title')
  if (form.idea.trim().length < 10) problems.push('a fuller idea (at least a sentence)')
  if (form.objective.trim().length < 3) problems.push('an objective')
  if (form.durationSeconds < meta.min || form.durationSeconds > meta.max) {
    problems.push(`a duration between ${formatDuration(meta.min)} and ${formatDuration(meta.max)}`)
  }

  const changePlatform = (value) => {
    const next = platformMeta(value)
    setForm((f) => ({
      ...f,
      platform: value,
      // Snap the duration into the new platform's range rather than leaving an
      // invalid value the creator has to notice and fix.
      durationSeconds: Math.min(Math.max(f.durationSeconds, next.min), next.max)
    }))
  }

  const submit = (event) => {
    event.preventDefault()
    if (problems.length === 0) onSubmit({ ...form, durationSeconds: Number(form.durationSeconds) })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Working title" htmlFor="title">
        <input id="title" className={inputClass} placeholder="Why your first salary disappears"
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>

      <Field label="Your idea" hint="A rough idea is fine. More specific gives a better first draft." htmlFor="idea">
        <textarea id="idea" rows={3} className={inputClass}
          placeholder="explain lifestyle inflation with a concrete monthly example"
          value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Platform" hint="Sets pacing, length and format conventions." htmlFor="platform">
          <select id="platform" className={inputClass} value={form.platform}
            onChange={(e) => changePlatform(e.target.value)}>
            {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>

        <Field label="Content type" hint={CONTENT_TYPES.find((c) => c.value === form.contentType)?.hint} htmlFor="contentType">
          <select id="contentType" className={inputClass} value={form.contentType}
            onChange={(e) => setForm({ ...form, contentType: e.target.value })}>
            {CONTENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Audience" hint="Pre-filled from your profile. Override it for this script if it differs." htmlFor="audience">
        <input id="audience" className={inputClass} placeholder="22-30, first job, India"
          value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
      </Field>

      <Field
        label="Objective"
        hint="What the viewer should do or understand. This is preserved through every regeneration and improvement."
        htmlFor="objective"
      >
        <input id="objective" className={inputClass} placeholder="make the viewer track one month of spending"
          value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
      </Field>

      <Field
        label={`Approximate length — ${formatDuration(Number(form.durationSeconds))}`}
        hint={`${PLATFORMS.find((p) => p.value === form.platform)?.label} allows ${formatDuration(meta.min)} to ${formatDuration(meta.max)}.`}
        htmlFor="duration"
      >
        <input id="duration" type="range" min={meta.min} max={meta.max} step={meta.max > 600 ? 30 : 5}
          className="w-full accent-indigo-600"
          value={form.durationSeconds}
          onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })} />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="ai" disabled={busy || problems.length > 0}>
          {busy ? 'Generating…' : 'Generate script'}
        </Button>
        {/* The reason is stated, not implied by a greyed-out button. */}
        {problems.length > 0 && (
          <p className="text-sm text-slate-500">Still needs {problems.join(', ')}.</p>
        )}
      </div>
    </form>
  )
}
