import { useEffect, useState } from 'react'
import { profile as profileApi, PLATFORMS } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Card, Field, inputClass, ErrorState, Loading } from '../components/ui.jsx'

const EMPTY = {
  niche: '', audience: '', tone: [], preferredPlatforms: [],
  stylePreferences: { prefer: [], avoid: [] }, sampleContent: []
}

const toList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean)
const fromList = (list) => (list ?? []).join(', ')

export default function Profile () {
  const { markProfileComplete } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    profileApi.get()
      .then(({ profile }) => { setForm({ ...EMPTY, ...profile }); setState('ready') })
      // 404 means "not set up yet", which is a normal starting point, not an error.
      .catch((err) => { if (err.code === 'NOT_FOUND') setState('ready'); else { setError(err); setState('ready') } })
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
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
    } catch (err) {
      setError(err)
    }
  }

  const togglePlatform = (value) => {
    setForm((f) => ({
      ...f,
      preferredPlatforms: f.preferredPlatforms.includes(value)
        ? f.preferredPlatforms.filter((p) => p !== value)
        : [...f.preferredPlatforms, value]
    }))
  }

  if (state === 'loading') return <Loading label="Loading your profile…" />

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900">Creator profile</h1>
      <p className="mt-1 text-sm text-slate-600">
        This is what makes generated scripts sound like you rather than like anyone.
        You can skip it entirely and still generate. Changes apply to future
        generations only, never to scripts you have already saved.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <Card title="Who you make content for">
          <div className="space-y-4">
            <Field label="Your niche" hint="Sets the subject matter and vocabulary the model reaches for." htmlFor="niche">
              <input id="niche" className={inputClass} placeholder="personal finance for early-career professionals"
                value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </Field>

            <Field label="Your audience" hint="Shapes reading level, examples and assumed knowledge." htmlFor="audience">
              <input id="audience" className={inputClass} placeholder="22-30, first job, India, English and Hinglish"
                value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card title="How you sound">
          <div className="space-y-4">
            <Field label="Tone" hint="Comma separated. Directly changes register and sentence rhythm." htmlFor="tone">
              <input id="tone" className={inputClass} placeholder="direct, warm, no-hype"
                value={fromList(form.tone)} onChange={(e) => setForm({ ...form, tone: toList(e.target.value) })} />
            </Field>

            <Field label="Prefer" hint="Things the model should lean into." htmlFor="prefer">
              <input id="prefer" className={inputClass} placeholder="concrete numbers, one idea per script"
                value={fromList(form.stylePreferences.prefer)}
                onChange={(e) => setForm({ ...form, stylePreferences: { ...form.stylePreferences, prefer: toList(e.target.value) } })} />
            </Field>

            <Field label="Avoid" hint="Things it should not do. Often the higher-leverage field." htmlFor="avoid">
              <input id="avoid" className={inputClass} placeholder="clickbait openings, excessive emojis"
                value={fromList(form.stylePreferences.avoid)}
                onChange={(e) => setForm({ ...form, stylePreferences: { ...form.stylePreferences, avoid: toList(e.target.value) } })} />
            </Field>
          </div>
        </Card>

        <Card title="Where you publish">
          <fieldset>
            <legend className="sr-only">Preferred platforms</legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const active = form.preferredPlatforms.includes(platform.value)
                return (
                  <button key={platform.value} type="button" onClick={() => togglePlatform(platform.value)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      active ? 'border-creator bg-violet-50 text-violet-900' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}>
                    {platform.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">Pre-fills the brief form. Does not restrict what you can write.</p>
          </fieldset>
        </Card>

        <Card title="Writing sample">
          <Field
            label="A piece of your own writing"
            hint="Used as a style reference only. It is never reused as content in a script."
            htmlFor="sample"
          >
            <textarea id="sample" rows={4} className={inputClass} placeholder="Last month I tracked every rupee I spent…"
              value={form.sampleContent[0] ?? ''}
              onChange={(e) => setForm({ ...form, sampleContent: e.target.value ? [e.target.value] : [] })} />
          </Field>
        </Card>

        <ErrorState error={error} />

        <div className="flex items-center gap-3">
          <Button type="submit">Save profile</Button>
          {/* aria-live so the confirmation is announced, not only shown. */}
          <span aria-live="polite" className="text-sm text-slate-500">
            {saved ? 'Saved. This applies to your next generation.' : ''}
          </span>
        </div>
      </form>
    </div>
  )
}
