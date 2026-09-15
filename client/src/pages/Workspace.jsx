import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { scripts as scriptsApi, profile as profileApi, SECTION_LABELS } from '../api/endpoints.js'
import { Button, Card, ErrorState, Loading, Badge, formatDuration } from '../components/ui.jsx'
import BriefForm from '../components/brief/BriefForm.jsx'
import GenerationProgress from '../components/GenerationProgress.jsx'
import ScriptEditor from '../components/editor/ScriptEditor.jsx'
import EvaluationPanel from '../components/evaluation/EvaluationPanel.jsx'

/**
 * The workspace is a state machine (spec 5.4). The UI renders from `state`;
 * there are no independent loading flags, which is what stops "generating" and
 * "saving" from ever being true at the same time.
 */
export default function Workspace () {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [state, setState] = useState(isNew ? 'DRAFT' : 'LOADING')
  const [script, setScript] = useState(null)
  const [sections, setSections] = useState([])
  const [profile, setProfile] = useState(null)
  // Tracked separately from `profile`, because "no profile" and "not fetched
  // yet" are different states and both produce a null profile. Without this the
  // brief form mounts with an empty audience and never picks up the profile's,
  // since the form seeds its state once at mount.
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [meta, setMeta] = useState(null)      // last generation's checks and usage
  const [variations, setVariations] = useState(null)
  const [error, setError] = useState(null)
  const [dirty, setDirty] = useState(false)

  const announcement = useRef(null)

  useEffect(() => {
    profileApi.get()
      .then(({ profile }) => setProfile(profile))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoaded(true))
  }, [])

  useEffect(() => {
    if (isNew) return
    setState('LOADING')
    scriptsApi.get(id)
      .then((data) => {
        setScript(data)
        setSections(data.script?.sections ?? [])
        setState(data.script?.sections?.length ? (data.status === 'SAVED' ? 'SAVED' : 'SCRIPT_READY') : 'CONTEXT_READY')
      })
      .catch(setError)
  }, [id, isNew])

  /**
   * Unsaved changes must survive a navigation attempt without silent loss
   * (spec 8.3). This covers closing the tab; in-app navigation is guarded by
   * the banner, which keeps the creator in the editor where the work is.
   */
  useEffect(() => {
    if (!dirty) return
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const run = async (label, work) => {
    setError(null)
    setVariations(null)
    setState('GENERATING')
    try {
      const result = await work()
      announcement.current = `${label} ready. ${result.script?.sections?.length ?? 0} sections.`
      return result
    } catch (err) {
      setError(err)
      // The brief is preserved and any previously saved script is untouched,
      // so retry is always safe.
      setState(script?.script?.sections?.length ? 'SCRIPT_READY' : 'GENERATION_FAILED')
      throw err
    }
  }

  const createAndGenerate = async (brief) => {
    setError(null)
    try {
      const created = await scriptsApi.create(brief)
      setScript(created)
      // Replace rather than push: the creator should not land back on an empty
      // brief form by pressing back.
      navigate(`/workspace/${created.scriptId}`, { replace: true })

      const result = await run('Draft', () => scriptsApi.generate(created.scriptId))
      applyResult(result)
    } catch (err) {
      if (!error) setError(err)
      setState('GENERATION_FAILED')
    }
  }

  const applyResult = (result) => {
    setScript((current) => ({ ...current, script: result.script, version: result.version ?? current?.version }))
    setSections(result.script.sections)
    setMeta(result)
    setDirty(false)
    setState('SCRIPT_READY')
  }

  const regenerate = async () => {
    try { applyResult(await run('New draft', () => scriptsApi.regenerate(id))) } catch { /* handled */ }
  }

  const improve = async (type, instruction) => {
    try { applyResult(await run('Improvement', () => scriptsApi.improve(id, { type, instruction }))) } catch { /* handled */ }
  }

  const requestVariations = async () => {
    setError(null)
    setState('GENERATING')
    try {
      const result = await scriptsApi.variations(id, { count: 3 })
      setVariations(result.variations)
      setState('SCRIPT_READY')
    } catch (err) {
      setError(err)
      setState('SCRIPT_READY')
    }
  }

  const adoptVariation = (variation) => {
    setSections(variation.script.sections.map((s) => ({ ...s, authoredBy: 'ai' })))
    setScript((current) => ({ ...current, script: variation.script }))
    setVariations(null)
    setDirty(true)
  }

  const editSection = (order, body) => {
    setSections((current) => current.map((s) => (s.order === order ? { ...s, body } : s)))
    setDirty(true)
  }

  const save = async () => {
    setError(null)
    try {
      const saved = await scriptsApi.update(id, {
        status: 'SAVED',
        version: script.version,
        sections: sections.map(({ order, body, heading }) => ({ order, body, heading }))
      })
      setScript(saved)
      setSections(saved.script.sections)
      setDirty(false)
      setState('SAVED')
    } catch (err) {
      setError(err)
    }
  }

  if (state === 'LOADING') return <Loading label="Opening your script…" />

  // ---- new script: the brief form is the whole screen ----
  if (isNew && state === 'DRAFT') {
    return (
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-slate-900">New script</h1>
        <p className="mt-1 text-sm text-slate-600">
          One pass from idea to a structured, editable draft.
        </p>
        <Card className="mt-5">
          {profileLoaded
            ? <BriefForm profile={profile} onSubmit={createAndGenerate} busy={false} />
            : <Loading label="Loading your defaults…" />}
        </Card>
        <ErrorState error={error} />
      </div>
    )
  }

  const busy = state === 'GENERATING'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <header className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">{script?.title}</h1>
          <Badge tone={state === 'SAVED' ? 'app' : 'slate'}>{state}</Badge>
          {dirty && <Badge tone="warn">unsaved changes</Badge>}

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/library')}>Library</Button>
            <Button onClick={save} disabled={!dirty || busy}>
              {dirty ? 'Save' : 'Saved'}
            </Button>
          </div>
        </header>

        <p aria-live="polite" className="sr-only">{announcement.current}</p>

        {error && <ErrorState error={error} onRetry={state === 'GENERATION_FAILED' ? regenerate : undefined} />}

        {busy && <GenerationProgress retrievalEnabled={meta?.retrieval?.enabled} />}

        {state === 'GENERATION_FAILED' && !busy && (
          <Card>
            <p className="text-sm text-slate-700">
              Your brief is safe. Nothing was overwritten. Try again when you are ready.
            </p>
            <Button className="mt-3" variant="ai" onClick={regenerate}>Retry generation</Button>
          </Card>
        )}

        {!busy && sections.length > 0 && (
          <ScriptEditor
            script={script.script}
            sections={sections}
            requestedDuration={script.brief?.durationSeconds}
            onEdit={editSection}
            onImproveSection={(type) => improve(type)}
            busy={busy}
          />
        )}

        {variations && (
          <Card title="Three alternatives, same topic and objective">
            <div className="grid gap-3 md:grid-cols-3">
              {variations.map((variation) => (
                <div key={variation.variationId} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">{variation.script.title}</p>
                  <p className="mt-2 line-clamp-6 text-xs text-slate-600">
                    {variation.script.sections.find((s) => s.kind === 'hook')?.body}
                  </p>
                  <Button variant="ghost" className="mt-3 w-full" onClick={() => adoptVariation(variation)}>
                    Use this one
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Whichever you do not adopt is discarded — they are never kept as phantom drafts.
            </p>
          </Card>
        )}
      </div>

      {/* ---- side rail ---- */}
      <aside className="space-y-4">
        <Card title="The brief">
          {script?.brief && (
            <dl className="space-y-2 text-sm">
              <Row label="Platform" value={script.brief.platform} />
              <Row label="Type" value={script.brief.contentType} />
              <Row label="Audience" value={script.brief.audience || '—'} />
              <Row label="Length" value={formatDuration(script.brief.durationSeconds)} />
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Objective</dt>
                <dd className="text-slate-800">{script.brief.objective}</dd>
              </div>
            </dl>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Preserved through every regeneration and improvement.
          </p>
        </Card>

        <Card title="Refine">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ai" disabled={busy || !sections.length} onClick={regenerate}>Regenerate</Button>
            <Button variant="ghost" disabled={busy || !sections.length} onClick={() => improve('change_tone')}>Change tone</Button>
            <Button variant="ghost" disabled={busy || !sections.length} onClick={() => improve('shorten')}>Shorten</Button>
            <Button variant="ghost" disabled={busy || !sections.length} onClick={() => improve('expand')}>Expand</Button>
            <Button variant="ghost" className="col-span-2" disabled={busy || !sections.length} onClick={requestVariations}>
              Give me 3 variations
            </Button>
          </div>
        </Card>

        {meta?.checks && (
          <Card title="Automated checks">
            <ul className="space-y-1 text-sm">
              <Check ok={meta.checks.requiredSectionsPresent}
                label={`Required sections${meta.checks.missingSections?.length ? ` (missing ${meta.checks.missingSections.join(', ')})` : ''}`} />
              <Check ok={meta.checks.notEmpty} label="No empty sections" />
              <Check ok={meta.checks.withinDurationTolerance}
                label={`Length ~${formatDuration(meta.checks.estimatedSeconds)}`} />
              <Check ok={meta.checks.platformReflected} label="Platform reflected" />
              <Check ok={meta.checks.noPromptLeakage} label="No prompt leakage" />
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              These check that the draft is <em>valid</em>. Whether it is <em>good</em> is the rating below.
            </p>
          </Card>
        )}

        {meta?.usage && (
          <Card title="This generation">
            <dl className="space-y-1 text-sm">
              <Row label="Tokens" value={`${meta.usage.promptTokens} in / ${meta.usage.completionTokens} out`} />
              <Row label="Cost" value={meta.usage.costUsd ? `$${meta.usage.costUsd}` : 'free tier'} />
              <Row label="Knowledge used" value={meta.retrieval?.usedCreatorKnowledge ? 'yes' : 'none retrieved'} />
            </dl>
          </Card>
        )}

        {meta?.generationId && (
          <EvaluationPanel scriptId={id} generationId={meta.generationId} />
        )}
      </aside>
    </div>
  )
}

function Row ({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  )
}

function Check ({ ok, label }) {
  return (
    <li className="flex items-start gap-2">
      {/* Never colour alone: an icon and text carry the same meaning (spec 8.6). */}
      <span aria-hidden="true" className={ok ? 'text-teal-600' : 'text-amber-600'}>{ok ? '✓' : '!'}</span>
      <span className="text-slate-700">{label}</span>
      <span className="sr-only">{ok ? 'passed' : 'needs attention'}</span>
    </li>
  )
}
