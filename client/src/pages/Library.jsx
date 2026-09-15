import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { scripts as scriptsApi, PLATFORMS, CONTENT_TYPES } from '../api/endpoints.js'
import { Button, Card, Empty, ErrorState, Loading, Badge, inputClass } from '../components/ui.jsx'

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

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [filters.q, filters.platform, filters.contentType, filters.status])

  const remove = async (scriptId, title) => {
    // Soft delete server-side, but it still disappears from the creator's view,
    // so confirm before doing it.
    if (!window.confirm(`Delete "${title}"? It leaves your library.`)) return
    try {
      await scriptsApi.remove(scriptId)
      load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Library</h1>
          <p className="text-sm text-slate-600">Everything you have written.</p>
        </div>
        <Button onClick={() => navigate('/workspace/new')}>New script</Button>
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            className={inputClass}
            placeholder="Search title or idea"
            aria-label="Search scripts"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
          <select className={inputClass} aria-label="Filter by platform"
            value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value })}>
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className={inputClass} aria-label="Filter by content type"
            value={filters.contentType} onChange={(e) => setFilters({ ...filters, contentType: e.target.value })}>
            <option value="">All types</option>
            {CONTENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className={inputClass} aria-label="Filter by status"
            value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Any status</option>
            <option value="DRAFT">Draft</option>
            <option value="SCRIPT_READY">Ready</option>
            <option value="SAVED">Saved</option>
          </select>
        </div>
      </Card>

      {/* Filters are preserved across a retry, so a failed load does not also
          throw away what the creator was looking for. */}
      {error && <ErrorState error={error} onRetry={load} />}

      {!data && !error && <Loading label="Loading your library…" />}

      {data && data.items.length === 0 && (
        <Card>
          <Empty
            title={filters.q || filters.platform || filters.status ? 'Nothing matches those filters' : 'No scripts yet'}
            action={<Button onClick={() => navigate('/workspace/new')}>Write one</Button>}
          >
            {filters.q || filters.platform || filters.status
              ? 'Try widening the search.'
              : 'Start with a rough idea and you will have a draft in one pass.'}
          </Empty>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {data.items.map((script) => (
              <li key={script.scriptId} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/workspace/${script.scriptId}`} className="block truncate font-medium text-slate-900 hover:text-app">
                    {script.title}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{script.platform}</span>
                    <span>·</span>
                    <span>{script.contentType}</span>
                    <span>·</span>
                    <span>v{script.version}</span>
                    <span>·</span>
                    <span>{script.sectionCount} sections</span>
                    <span>·</span>
                    <span>{new Date(script.updatedAt).toLocaleDateString()}</span>
                  </p>
                </div>

                <Badge tone={script.status === 'SAVED' ? 'app' : 'slate'}>{script.status}</Badge>
                <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => remove(script.scriptId, script.title)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">{data.total} script{data.total === 1 ? '' : 's'}</p>
        </Card>
      )}
    </div>
  )
}
