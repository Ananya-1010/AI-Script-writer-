import { useState } from 'react'
import { PLATFORMS, CONTENT_TYPES } from '../../api/endpoints.js'
import { Button, Field, inputClass, Eyebrow, formatDuration } from '../ui.jsx'

/**
 * A commissioning form, not a settings panel.
 *
 * It opens with the idea set in the script's own serif, because that is the
 * moment you are actually thinking. Platform and content type are pressable
 * words rather than selects — they are a choice between kinds of thing, and a
 * dropdown hides the options at the exact moment you are choosing.
 *
 * Generate stays disabled with the reason written out (spec 8.3). A grey button
 * with no explanation is the most common small cruelty in software.
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
      // Snap into the new range rather than leaving an invalid value to be
      // discovered later.
      durationSeconds: Math.min(Math.max(f.durationSeconds, next.min), next.max)
    }))
  }

  const submit = (event) => {
    event.preventDefault()
    if (!missing.length) onSubmit({ ...form, durationSeconds: Number(form.durationSeconds) })
  }

  return (
    <form onSubmit={submit} className="space-y-14">
      <section className="space-y-8">
        <Field label="What is the idea?" htmlFor="idea"
          hint="A rough thought is enough. The more specific you are, the less you will have to fix.">
          <textarea
            id="idea" rows={3} autoFocus
            placeholder="explain lifestyle inflation with a concrete month-by-month example…"
            className={`${inputClass} font-script text-lg leading-relaxed`}
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
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          {PLATFORMS.map((option) => (
            <Word key={option.value} active={form.platform === option.value} onClick={() => changePlatform(option.value)}>
              {option.label}
            </Word>
          ))}
        </div>
      </Group>

      <Group label="What kind of piece?" hint="Decides which sections the script must have.">
        <div className="divide-y divide-rule border-y border-rule">
          {CONTENT_TYPES.map((option) => {
            const active = form.contentType === option.value
            return (
              <button
                key={option.value} type="button" aria-pressed={active}
                onClick={() => setForm({ ...form, contentType: option.value })}
                className="group flex w-full items-baseline gap-4 py-3.5 text-left"
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${active ? 'bg-brass' : 'bg-ink-faint/50 group-hover:bg-ink-tertiary'}`} />
                <span className={`display text-lg transition-colors ${active ? 'text-ink' : 'text-ink-tertiary group-hover:text-ink-secondary'}`}>
                  {option.label}
                </span>
                <span className="ml-auto hidden text-xs text-ink-tertiary sm:inline">{option.hint}</span>
              </button>
            )
          })}
        </div>
      </Group>

      <Group label="How long?" hint={`${platform.label} works between ${formatDuration(platform.min)} and ${formatDuration(platform.max)}.`}>
        <div className="flex items-center gap-6">
          <input
            id="duration" type="range" aria-label="Approximate length"
            min={platform.min} max={platform.max} step={platform.max > 600 ? 30 : 5}
            className="h-[3px] flex-1 cursor-pointer appearance-none bg-ink/12 accent-brass"
            value={form.durationSeconds}
            onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })}
          />
          <output className="display w-24 shrink-0 text-right text-2xl tabular-nums text-ink">
            {formatDuration(Number(form.durationSeconds))}
          </output>
        </div>
      </Group>

      <section className="space-y-8">
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

      <div className="flex flex-wrap items-center gap-5 border-t border-rule pt-8">
        <Button type="submit" variant="ink" size="lg" disabled={busy || missing.length > 0}>
          {busy ? 'Generating…' : 'Generate the script'}
        </Button>
        {missing.length > 0 && (
          <p className="text-sm text-ink-tertiary">Still needs {missing.join(', ')}.</p>
        )}
      </div>
    </form>
  )
}

function Group ({ label, hint, children }) {
  return (
    <section className="space-y-5">
      <div>
        <Eyebrow>{label}</Eyebrow>
        {hint && <p className="mt-2 text-xs text-ink-tertiary">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** A word you press, underlined in brass when chosen. No pills, no chips. */
function Word ({ active, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      className={`display relative pb-1 text-lg transition-colors duration-DEFAULT ${
        active ? 'text-ink' : 'text-ink-tertiary hover:text-ink-secondary'
      }`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[2px] bg-brass transition-all duration-DEFAULT ease-out ${active ? 'w-full' : 'w-0'}`}
      />
    </button>
  )
}
