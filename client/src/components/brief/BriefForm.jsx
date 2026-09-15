import { useState } from 'react'
import { PLATFORMS, CONTENT_TYPES } from '../../api/endpoints.js'
import { Button, Field, inputClass, formatDuration } from '../ui.jsx'

/**
 * The brief is an interview, not a form.
 *
 * It opens with the idea in the serif the script will be written in, because
 * that is the moment the creator is actually thinking. Platform and content
 * type are pressable cards rather than selects — they are a choice between
 * kinds of thing, and a dropdown hides the options at the moment you are
 * choosing between them.
 *
 * Generate stays disabled with the reason written out (spec 8.3). A grey
 * button with no explanation is the most common small cruelty in software.
 */
export default function BriefForm ({ profile, onSubmit, busy }) {
  const meta = (value) => PLATFORMS.find((p) => p.value === value)
  const defaultPlatform = profile?.preferredPlatforms?.[0] ?? 'youtube'

  const [form, setForm] = useState({
    title: '',
    idea: '',
    platform: defaultPlatform,
    contentType: 'educational',
    audience: profile?.audience ?? '',
    objective: '',
    durationSeconds: meta(defaultPlatform)?.default ?? 480
  })

  const platform = meta(form.platform)

  const missing = []
  if (!form.title.trim()) missing.push('a working title')
  if (form.idea.trim().length < 10) missing.push('a fuller idea')
  if (form.objective.trim().length < 3) missing.push('an objective')

  const changePlatform = (value) => {
    const next = meta(value)
    setForm((f) => ({
      ...f,
      platform: value,
      // Snap into the new range rather than leaving an invalid value for the
      // creator to discover.
      durationSeconds: Math.min(Math.max(f.durationSeconds, next.min), next.max)
    }))
  }

  const submit = (event) => {
    event.preventDefault()
    if (!missing.length) onSubmit({ ...form, durationSeconds: Number(form.durationSeconds) })
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <section className="space-y-4">
        <Field label="What is the idea?" htmlFor="idea"
          hint="A rough thought is enough. The more specific you are, the less you will have to fix.">
          <textarea
            id="idea" rows={3} autoFocus
            placeholder="explain lifestyle inflation with a concrete month-by-month example…"
            className={`${inputClass} font-serif text-[17px] leading-relaxed`}
            value={form.idea}
            onChange={(e) => setForm({ ...form, idea: e.target.value })}
          />
        </Field>

        <Field label="Working title" htmlFor="title">
          <input id="title" className={inputClass} placeholder="Why your first salary disappears"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
      </section>

      <Group label="Where is it going?" hint="Sets pacing, length and format conventions.">
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((option) => (
            <Chip
              key={option.value}
              active={form.platform === option.value}
              onClick={() => changePlatform(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group label="What kind of piece?" hint="Decides which sections the script must have.">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {CONTENT_TYPES.map((option) => (
            <Card
              key={option.value}
              active={form.contentType === option.value}
              onClick={() => setForm({ ...form, contentType: option.value })}
              title={option.label}
              hint={option.hint}
            />
          ))}
        </div>
      </Group>

      <Group label="How long?" hint={`${platform.label} works between ${formatDuration(platform.min)} and ${formatDuration(platform.max)}.`}>
        <div className="flex items-center gap-4">
          <input
            id="duration" type="range" aria-label="Approximate length"
            min={platform.min} max={platform.max} step={platform.max > 600 ? 30 : 5}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-sunken accent-accent"
            value={form.durationSeconds}
            onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })}
          />
          <output className="w-20 shrink-0 text-right font-serif text-xl tabular-nums text-content">
            {formatDuration(Number(form.durationSeconds))}
          </output>
        </div>
      </Group>

      <section className="space-y-4">
        <Field label="Who is it for?" htmlFor="audience"
          hint={profile?.audience ? 'Pre-filled from your profile. Override it for this script if it differs.' : 'Shapes reading level, examples and assumed knowledge.'}>
          <input id="audience" className={inputClass} placeholder="22-30, first job, India"
            value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
        </Field>

        <Field label="What should it achieve?" htmlFor="objective"
          hint="Preserved through every regeneration and improvement. Nothing else can change it.">
          <input id="objective" className={inputClass} placeholder="make the viewer track one month of spending"
            value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" variant="primary" size="lg" disabled={busy || missing.length > 0}>
          {busy ? 'Generating…' : 'Generate script'}
        </Button>
        {missing.length > 0 && (
          <p className="text-sm text-content-tertiary">
            Still needs {missing.join(', ')}.
          </p>
        )}
      </div>
    </form>
  )
}

function Group ({ label, hint, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-content">{label}</h3>
        {hint && <p className="mt-0.5 text-xs text-content-tertiary">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Chip ({ active, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm transition ease-out ${
        active
          ? 'bg-content text-bg'
          : 'text-content-secondary hairline hover:border-line-strong hover:text-content'
      }`}
    >
      {children}
    </button>
  )
}

function Card ({ active, onClick, title, hint }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-md px-3 py-2.5 text-left transition ease-out ${
        active
          ? 'bg-accent-soft ring-1 ring-accent/40'
          : 'hairline hover:border-line-strong hover:bg-surface-raised'
      }`}
    >
      <span className={`block text-sm font-medium ${active ? 'text-accent-text' : 'text-content'}`}>{title}</span>
      <span className="mt-0.5 block text-xs text-content-tertiary">{hint}</span>
    </button>
  )
}
