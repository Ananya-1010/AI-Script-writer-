import { useEffect, useState } from 'react'
import { profile as profileApi, PLATFORMS } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Field, inputClass, ErrorState, Loading } from '../components/ui.jsx'

const EMPTY = {
  niche: '', audience: '', tone: [], preferredPlatforms: [],
  stylePreferences: { prefer: [], avoid: [] }, sampleContent: []
}

const toList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean)
const fromList = (list) => (list ?? []).join(', ')

/**
 * One screen, no wizard (spec 8.3), grouped by question rather than by data
 * shape. Every field says in one line how it changes generated output — a
 * field whose effect cannot be explained does not belong here at all.
 */
export default function Profile () {
  const { markProfileComplete } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    profileApi.get()
      .then(({ profile }) => { setForm({ ...EMPTY, ...profile }); setState('ready') })
      .catch((err) => {
        // 404 means "not set up yet", which is a starting point, not an error.
        if (err.code !== 'NOT_FOUND') setError(err)
        setState('ready')
      })
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError(null); setSaved(false)
    try {
      await profileApi.save({
        niche: form.niche,
        audience: form.audience,
        tone: form.tone,
        preferredPlatforms: form.preferredPlatforms,
        stylePreferences: form.stylePreferences,
        sampleContent: form.sampleContent
      })
      markProfileComplete()
      setSaved(true)
    } catch (err) { setError(err) }
  }

  const togglePlatform = (value) => setForm((f) => ({
    ...f,
    preferredPlatforms: f.preferredPlatforms.includes(value)
      ? f.preferredPlatforms.filter((p) => p !== value)
      : [...f.preferredPlatforms, value]
  }))

  if (state === 'loading') return <Loading label="Loading your profile" lines={6} />

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-10">
        <h1 className="display text-3xl text-ink">Your creator profile</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-tertiary">
          This is what makes a script sound like you rather than like anyone.
          You can skip it entirely and still generate. Changes apply to future
          generations only — never to a script you have already saved.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-10">
        <Group title="Who you make content for">
          <Field label="Your niche" htmlFor="niche"
            hint="Sets the subject matter and the vocabulary the model reaches for.">
            <input id="niche" className={inputClass} placeholder="personal finance for early-career professionals"
              value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
          </Field>

          <Field label="Your audience" htmlFor="audience"
            hint="Shapes reading level, examples and assumed knowledge.">
            <input id="audience" className={inputClass} placeholder="22-30, first job, India, English and Hinglish"
              value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </Field>
        </Group>

        <Group title="How you sound">
          <Field label="Tone" htmlFor="tone" hint="Comma separated. Changes register and sentence rhythm directly.">
            <input id="tone" className={inputClass} placeholder="direct, warm, no-hype"
              value={fromList(form.tone)} onChange={(e) => setForm({ ...form, tone: toList(e.target.value) })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lean into" htmlFor="prefer" hint="Things you want more of.">
              <input id="prefer" className={inputClass} placeholder="concrete numbers"
                value={fromList(form.stylePreferences.prefer)}
                onChange={(e) => setForm({ ...form, stylePreferences: { ...form.stylePreferences, prefer: toList(e.target.value) } })} />
            </Field>

            <Field label="Never do" htmlFor="avoid" hint="Usually the higher-leverage field.">
              <input id="avoid" className={inputClass} placeholder="clickbait openings"
                value={fromList(form.stylePreferences.avoid)}
                onChange={(e) => setForm({ ...form, stylePreferences: { ...form.stylePreferences, avoid: toList(e.target.value) } })} />
            </Field>
          </div>
        </Group>

        <Group title="Where you publish" hint="Pre-fills the brief form. Does not restrict what you can write.">
          <fieldset>
            <legend className="sr-only">Preferred platforms</legend>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((platform) => {
                const active = form.preferredPlatforms.includes(platform.value)
                return (
                  <button
                    key={platform.value} type="button" aria-pressed={active}
                    onClick={() => togglePlatform(platform.value)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ease-out ${
                      active
                        ? 'bg-brass-soft text-brass ring-1 ring-brass/30'
                        : 'sheet text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {platform.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </Group>

        <Group title="A sample of your writing">
          <Field label="Something you have written" htmlFor="sample"
            hint="A style reference only. It is never reused as content inside a script.">
            <textarea id="sample" rows={4}
              className={`${inputClass} display text-[16px] leading-relaxed`}
              placeholder="Last month I tracked every rupee I spent…"
              value={form.sampleContent[0] ?? ''}
              onChange={(e) => setForm({ ...form, sampleContent: e.target.value ? [e.target.value] : [] })} />
          </Field>
        </Group>

        <ErrorState error={error} />

        <div className="flex items-center gap-3 border-t border-rule pt-6">
          <Button type="submit" variant="ink" size="lg">Save profile</Button>
          <span aria-live="polite" className="text-sm text-graphite">
            {saved ? 'Saved — this applies to your next generation.' : ''}
          </span>
        </div>
      </form>
    </div>
  )
}

function Group ({ title, hint, children }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-tertiary">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
