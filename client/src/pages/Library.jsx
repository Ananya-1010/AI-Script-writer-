import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { scripts as scriptsApi, PLATFORMS, FILTERABLE_CONTENT_TYPES } from '../api/endpoints.js'
import {
  Button, Empty, ErrorState, Loading, Status, Select, Confirm, Eyebrow, inputClass, Stagger, Item
} from '../components/ui.jsx'

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCRIPT_READY', label: 'Ready' },
  { value: 'SAVED', label: 'Saved' }
]

/**
 * An index, set as a list.
 *
 * Titles form one readable column in the display face with metadata demoted
 * beneath, separated by hairlines rather than gaps — a library is scanned far
 * more often than it is browsed, and a hairline list scans faster than cards.
 *
 * The filter bar is a compact inline row. The previous version stacked three
 * full-width native selects down the page, which read as unstyled HTML and
 * pushed the actual content below the fold.
 */
export default function Library () {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ q: '', platform: '', contentType: '', status: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

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

  const confirmDelete = async () => {
    const target = pendingDelete
    setPendingDelete(null)
    try { await scriptsApi.remove(target.scriptId); load() } catch (err) { setError(err) }
  }

  const filtered = Boolean(filters.q || filters.platform || filters.contentType || filters.status)
  const clear = () => setFilters({ q: '', platform: '', contentType: '', status: '' })

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-8">
        <div>
          <Eyebrow>The library</Eyebrow>
          <h1 className="display mt-5 text-[clamp(2.4rem,5vw,3.4rem)] text-ink">
            {data ? <>{data.total} script{data.total === 1 ? '' : 's'}</> : 'Everything you have written'}
          </h1>
        </div>
        <Button variant="ink" size="lg" onClick={() => navigate('/workspace/new')}>New script</Button>
      </header>

      {/* One row, all controls aligned on a shared baseline rule. */}
      <div className="grid grid-cols-2 items-end gap-x-6 gap-y-5 py-7 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="library-search" className="label text-ink-tertiary">Search</label>
          <input
            id="library-search"
            className={`${inputClass} mt-1 py-1.5 text-sm`}
            placeholder="Title or idea…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>

        <Filter label="Platform">
          <Select label="Platform" placeholder="All platforms" options={PLATFORMS}
            value={filters.platform} onChange={(v) => setFilters({ ...filters, platform: v })} />
        </Filter>

        <Filter label="Type">
          <Select label="Content type" placeholder="All types" options={FILTERABLE_CONTENT_TYPES}
            value={filters.contentType} onChange={(v) => setFilters({ ...filters, contentType: v })} />
        </Filter>

        <Filter label="Status">
          <Select label="Status" placeholder="Any status" options={STATUSES}
            value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
        </Filter>

        <div className="col-span-2 md:col-span-1">
          {filtered && <Button size="sm" variant="quiet" className="!px-0" onClick={clear}>Clear</Button>}
        </div>
      </div>

      {/* Filters survive a failed load, so a retry does not also throw away
          what the creator was looking for. */}
      <ErrorState error={error} onRetry={load} className="mt-4" />

      {!data && !error && <div className="mt-8"><Loading label="Loading your library" lines={5} /></div>}

      {data && data.items.length === 0 && (
        <Empty
          title={filtered ? 'Nothing matches those filters.' : 'The shelf is empty.'}
          action={filtered
            ? <Button variant="outline" onClick={clear}>Clear filters</Button>
            : <Button variant="ink" size="lg" onClick={() => navigate('/workspace/new')}>Write the first one</Button>}
        >
          {filtered
            ? 'Try widening the search or clearing a filter.'
            : 'Start with a rough idea and you will have a structured draft in one pass.'}
        </Empty>
      )}

      {data && data.items.length > 0 && (
        <Stagger gap={0.04} className="divide-y divide-rule border-t border-rule">
          {data.items.map((script) => (
            <Item key={script.scriptId}>
              <div className="group relative">
                <Link to={`/workspace/${script.scriptId}`} className="block py-5 pr-28">
                  <motion.p
                    whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="display truncate text-xl text-ink transition-colors duration-DEFAULT group-hover:text-brass"
                  >
                    {script.title}
                  </motion.p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-tertiary">
                    <span>{script.platform}</span>
                    <Dot /><span>{script.contentType.replace('_', ' ')}</span>
                    <Dot /><span className="tabular-nums">{script.sectionCount} sections</span>
                    <Dot /><span className="tabular-nums">v{script.version}</span>
                    <Dot /><span>{new Date(script.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  </p>
                </Link>

                <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-4">
                  <Status tone={script.status === 'SAVED' ? 'brass' : 'neutral'}>
                    {script.status.toLowerCase().replace('_', ' ')}
                  </Status>
                  <button
                    onClick={() => setPendingDelete(script)}
                    aria-label={`Delete ${script.title}`}
                    className="text-xs text-ink-faint opacity-0 transition hover:text-brass focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Item>
          ))}
        </Stagger>
      )}

      <Confirm
        open={Boolean(pendingDelete)}
        title={`Delete “${pendingDelete?.title}”?`}
        body="It leaves your library. Its generations and evaluations are kept, so your quality history stays intact."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

const Dot = () => <span aria-hidden="true" className="text-ink-faint">·</span>

function Filter ({ label, children }) {
  return (
    <div>
      <span className="label text-ink-tertiary">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  )
}
