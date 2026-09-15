import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { scripts as scriptsApi, PLATFORMS, CONTENT_TYPES } from '../api/endpoints.js'
import { Button, Empty, ErrorState, Loading, Status, inputClass } from '../components/ui.jsx'

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCRIPT_READY', label: 'Ready' },
  { value: 'SAVED', label: 'Saved' }
]

/**
 * A list, not a table of cards.
 *
 * Rows separated by hairlines read faster than rows separated by gaps, and a
 * library is scanned far more often than it is browsed. Metadata sits in one
 * quiet line under the title so the titles form a single readable column.
 */
export default function Library () {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ q: '', platform: '', contentType: '', status: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    scriptsApi.list(params).then(setData).catch(setError)
  }

  // Debounced: one request per pause, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [filters.q, filters.platform, filters.contentType, filters.status])

  const remove = async (scriptId, title) => {
    if (!window.confirm(`Delete “${title}”? It leaves your library.`)) return
    try { await scriptsApi.remove(scriptId); load() } catch (err) { setError(err) }
  }

  const filtered = Boolean(filters.q || filters.platform || filters.contentType || filters.status)
  const clear = () => setFilters({ q: '', platform: '', contentType: '', status: '' })

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-content">Library</h1>
          <p className="mt-1.5 text-sm text-content-tertiary">
            {data ? `${data.total} script${data.total === 1 ? '' : 's'}` : 'Everything you have written.'}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/workspace/new')}>New script</Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} w-full sm:w-64`}
          placeholder="Search title or idea…"
          aria-label="Search scripts"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />

        <Select value={filters.platform} onChange={(v) => setFilters({ ...filters, platform: v })}
          placeholder="All platforms" options={PLATFORMS} />
        <Select value={filters.contentType} onChange={(v) => setFilters({ ...filters, contentType: v })}
          placeholder="All types" options={CONTENT_TYPES} />
        <Select value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
          placeholder="Any status" options={STATUSES} />

        {filtered && (
          <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>
        )}
      </div>

      {/* Filters survive a failed load, so a retry does not also throw away
          what the creator was looking for. */}
      <ErrorState error={error} onRetry={load} />

      {!data && !error && <Loading label="Loading your library" lines={5} />}

      {data && data.items.length === 0 && (
        <Empty
          icon={filtered ? '⌕' : '✎'}
          title={filtered ? 'Nothing matches those filters' : 'No scripts yet'}
          action={filtered
            ? <Button onClick={clear}>Clear filters</Button>
            : <Button variant="primary" onClick={() => navigate('/workspace/new')}>Write one</Button>}
        >
          {filtered
            ? 'Try widening the search or clearing a filter.'
            : 'Start with a rough idea and you will have a draft in one pass.'}
        </Empty>
      )}

      {data && data.items.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {data.items.map((script) => (
            <li key={script.scriptId} className="group relative">
              <Link to={`/workspace/${script.scriptId}`} className="block py-3.5 pr-20">
                <p className="truncate text-md text-content transition-colors group-hover:text-accent-text">
                  {script.title}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-content-tertiary">
                  <span>{script.platform}</span>
                  <Dot /><span>{script.contentType.replace('_', ' ')}</span>
                  <Dot /><span className="tabular-nums">{script.sectionCount} sections</span>
                  <Dot /><span className="tabular-nums">v{script.version}</span>
                  <Dot /><span>{new Date(script.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                </p>
              </Link>

              <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <Status tone={script.status === 'SAVED' ? 'accent' : 'neutral'}>
                  {script.status.toLowerCase().replace('_', ' ')}
                </Status>
                <Button
                  size="sm" variant="danger"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => remove(script.scriptId, script.title)}
                  aria-label={`Delete ${script.title}`}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const Dot = () => <span aria-hidden="true" className="text-content-faint">·</span>

function Select ({ value, onChange, placeholder, options }) {
  return (
    <select
      aria-label={placeholder}
      className={`${inputClass} w-auto ${value ? 'text-content' : 'text-content-tertiary'}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
