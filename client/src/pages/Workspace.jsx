import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { scripts as scriptsApi, profile as profileApi } from '../api/endpoints.js'
import { Button, Panel, ErrorState, Loading, Status, Tag, formatDuration } from '../components/ui.jsx'
import BriefForm from '../components/brief/BriefForm.jsx'
import GenerationProgress from '../components/GenerationProgress.jsx'
import ScriptEditor from '../components/editor/ScriptEditor.jsx'
import EvaluationPanel from '../components/evaluation/EvaluationPanel.jsx'

/**
 * The composing surface.
 *
 * Layout is asymmetric on purpose: the script is centred in the page at its own
 * measure, and the rail sits to the right at a smaller type size. A 50/50 split
 * would make the metadata feel as important as the writing, which it is not.
 *
 * The UI renders from `state` alone (spec 5.4), so "generating" and "saving"
 * can never both be true.
 */
export default function Workspace () {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [state, setState] = useState(isNew ? 'DRAFT' : 'LOADING')
  const [script, setScript] = useState(null)
  const [sections, setSections] = useState([])
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [meta, setMeta] = useState(null)
  const [variations, setVariations] = useState(null)
  const [error, setError] = useState(null)
  const [dirty, setDirty] = useState(false)

  const announcement = useRef('')

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

  // Unsaved work must survive a navigation attempt without silent loss.
  useEffect(() => {
    if (!dirty) return
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // ⌘S / Ctrl-S. A writing tool that ignores the save shortcut feels like a
  // web page rather than an instrument.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (dirty && state !== 'GENERATING') save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const run = async (label, work) => {
    setError(null); setVariations(null); setState('GENERATING')
    try {
      const result = await work()
      announcement.current = `${label} ready, ${result.script?.sections?.length ?? 0} sections.`
      return result
    } catch (err) {
      setError(err)
      setState(sections.length ? 'SCRIPT_READY' : 'GENERATION_FAILED')
      throw err
    }
  }

  const applyResult = (result) => {
    setScript((current) => ({ ...current, script: result.script, version: result.version ?? current?.version }))
    setSections(result.script.sections)
    setMeta(result)
    setDirty(false)
    setState('SCRIPT_READY')
  }

  const createAndGenerate = async (brief) => {
    setError(null)
    try {
      const created = await scriptsApi.create(brief)
      setScript(created)
      navigate(`/workspace/${created.scriptId}`, { replace: true })
      applyResult(await run('Draft', () => scriptsApi.generate(created.scriptId)))
    } catch (err) {
      setError((current) => current ?? err)
      setState('GENERATION_FAILED')
    }
  }

  const regenerate = async () => {
    try { applyResult(await run('New draft', () => scriptsApi.regenerate(id))) } catch { /* shown */ }
  }

  const improve = async (type) => {
    try { applyResult(await run('Improvement', () => scriptsApi.improve(id, { type }))) } catch { /* shown */ }
  }

  const requestVariations = async () => {
    setError(null); setState('GENERATING')
    try {
      const result = await scriptsApi.variations(id, { count: 3 })
      setVariations(result.variations)
      setState('SCRIPT_READY')
    } catch (err) {
      setError(err); setState('SCRIPT_READY')
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

  async function save () {
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
      announcement.current = 'Saved.'
    } catch (err) { setError(err) }
  }

  if (state === 'LOADING') {
    return <div className="mx-auto max-w-2xl pt-8"><Loading label="Opening your script" lines={6} /></div>
  }

  /* ---------------------------------------------------- new: the brief ---- */
  if (isNew && state === 'DRAFT') {
    return (
      <div className="mx-auto max-w-xl animate-in py-4">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.08em] text-content-tertiary">New script</p>
          <h1 className="mt-2 font-serif text-3xl text-content">What are we writing?</h1>
        </header>

        {profileLoaded
          ? <BriefForm profile={profile} onSubmit={createAndGenerate} busy={false} />
          : <Loading label="Loading your defaults" lines={4} />}

        <ErrorState error={error} className="mt-6" />
      </div>
    )
  }

  const busy = state === 'GENERATING'

  /**
   * Width is set by the script, not by the viewport. The text column is capped
   * at its reading measure, so the container is sized to measure + rail + gap.
   * Letting the column stretch to a 1fr of the viewport leaves a dead gutter
   * between the script and the rail, which reads as a layout bug.
   */
  return (
    <div className="mx-auto max-w-[57rem]">
      {/* Action bar. Sticks under the header so save is always reachable from
          the bottom of a long script. */}
      <div className="sticky top-12 z-10 -mx-4 mb-8 border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-content">{script?.title}</p>
            <div className="mt-0.5 flex items-center gap-2.5">
              <Status tone={state === 'SAVED' ? 'accent' : busy ? 'ai' : 'neutral'}>
                {busy ? 'generating' : state.toLowerCase().replace('_', ' ')}
              </Status>
              {dirty && <Tag tone="warn">unsaved</Tag>}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => navigate('/library')}>Library</Button>
            <Button size="sm" variant={dirty ? 'primary' : 'secondary'} onClick={save} disabled={!dirty || busy}>
              {dirty ? 'Save' : 'Saved'}
            </Button>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">{announcement.current}</p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
        {/* ------------------------------------------------------ script ---- */}
        <div className="min-w-0">
          <ErrorState error={error} onRetry={state === 'GENERATION_FAILED' ? regenerate : undefined} className="mb-6" />

          {busy && <GenerationProgress retrievalEnabled={meta?.retrieval?.enabled} />}

          {state === 'GENERATION_FAILED' && !busy && (
            <div className="measure py-10">
              <p className="font-serif text-xl text-content">That generation did not land.</p>
              <p className="mt-2 text-sm text-content-tertiary">
                Your brief is intact and nothing was overwritten. Retrying is always safe.
              </p>
              <Button variant="primary" className="mt-5" onClick={regenerate}>Try again</Button>
            </div>
          )}

          {!busy && sections.length > 0 && (
            <ScriptEditor
              script={script.script}
              sections={sections}
              requestedDuration={script.brief?.durationSeconds}
              onEdit={editSection}
              onImproveSection={improve}
              busy={busy}
            />
          )}

          {variations && (
            <div className="mt-14 border-t border-line pt-8">
              <h2 className="text-sm font-medium text-content">Three openings, same objective</h2>
              <p className="mt-1 text-xs text-content-tertiary">
                Each takes a different angle. Whichever you do not adopt is discarded.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {variations.map((variation) => (
                  <button
                    key={variation.variationId}
                    onClick={() => adoptVariation(variation)}
                    className="group rounded-md p-4 text-left hairline transition ease-out hover:border-accent/50 hover:bg-surface-raised"
                  >
                    <p className="font-serif text-md leading-snug text-content">{variation.script.title}</p>
                    <p className="mt-2.5 line-clamp-5 font-serif text-sm leading-relaxed text-content-tertiary">
                      {variation.script.sections.find((s) => s.kind === 'hook')?.body}
                    </p>
                    <span className="mt-3 inline-block text-xs text-accent-text opacity-0 transition-opacity group-hover:opacity-100">
                      Use this one →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------- rail ---- */}
        <aside className="space-y-6 text-sm lg:sticky lg:top-28 lg:self-start">
          <Rail title="Refine">
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="secondary" disabled={busy || !sections.length} onClick={regenerate}>Regenerate</Button>
              <Button size="sm" variant="secondary" disabled={busy || !sections.length} onClick={() => improve('change_tone')}>Change tone</Button>
              <Button size="sm" variant="secondary" disabled={busy || !sections.length} onClick={() => improve('shorten')}>Shorten</Button>
              <Button size="sm" variant="secondary" disabled={busy || !sections.length} onClick={() => improve('expand')}>Expand</Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-1.5 w-full" disabled={busy || !sections.length} onClick={requestVariations}>
              Give me 3 variations
            </Button>
          </Rail>

          {script?.brief && (
            <Rail title="The brief">
              <dl className="space-y-1.5 text-xs">
                <Row label="Platform" value={script.brief.platform} />
                <Row label="Type" value={script.brief.contentType.replace('_', ' ')} />
                <Row label="Audience" value={script.brief.audience || '—'} />
                <Row label="Length" value={formatDuration(script.brief.durationSeconds)} />
              </dl>
              <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-content-secondary">
                {script.brief.objective}
              </p>
              <p className="mt-2 text-micro text-content-faint">
                Preserved through every regeneration.
              </p>
            </Rail>
          )}

          {meta?.checks && (
            <Rail title="Checks">
              <ul className="space-y-1.5 text-xs">
                <Check ok={meta.checks.requiredSectionsPresent}
                  label={meta.checks.missingSections?.length
                    ? `Missing ${meta.checks.missingSections.join(', ')}`
                    : 'Required sections'} />
                <Check ok={meta.checks.notEmpty} label="No empty sections" />
                <Check ok={meta.checks.withinDurationTolerance} label={`Length ~${formatDuration(meta.checks.estimatedSeconds)}`} />
                <Check ok={meta.checks.platformReflected} label="Platform reflected" />
                <Check ok={meta.checks.noPromptLeakage} label="No prompt leakage" />
              </ul>
              <p className="mt-3 text-micro leading-relaxed text-content-faint">
                These say the draft is <em>valid</em>. Whether it is <em>good</em> is the rating below.
              </p>
            </Rail>
          )}

          {meta?.usage && (
            <Rail title="This generation">
              <dl className="space-y-1.5 text-xs">
                {/* "876 / 870" reads as a fraction. These are two separate
                    quantities and have to be labelled as such. */}
                <Row label="Prompt" value={`${meta.usage.promptTokens} tokens`} />
                <Row label="Output" value={`${meta.usage.completionTokens} tokens`} />
                <Row label="Cost" value={meta.usage.costUsd ? `$${meta.usage.costUsd}` : 'free tier'} />
                <Row label="Knowledge" value={meta.retrieval?.usedCreatorKnowledge ? 'yours used' : 'none retrieved'} />
              </dl>
            </Rail>
          )}

          {meta?.generationId && <EvaluationPanel scriptId={id} generationId={meta.generationId} />}
        </aside>
      </div>
    </div>
  )
}

/** Rail sections are headings and content — no cards. Cards in a sidebar make
    the sidebar look as heavy as the thing it is annotating. */
function Rail ({ title, children }) {
  return (
    <section>
      <h2 className="mb-2.5 text-micro font-medium uppercase tracking-[0.08em] text-content-tertiary">{title}</h2>
      {children}
    </section>
  )
}

function Row ({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className="truncate text-right text-content-secondary">{value}</dd>
    </div>
  )
}

function Check ({ ok, label }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden="true" className={`mt-px ${ok ? 'text-ai' : 'text-warn'}`}>{ok ? '✓' : '!'}</span>
      <span className="text-content-secondary">{label}</span>
      <span className="sr-only">{ok ? 'passed' : 'needs attention'}</span>
    </li>
  )
}
