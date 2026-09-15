import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboard as dashboardApi } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Card, Empty, ErrorState, Loading, Badge } from '../components/ui.jsx'

/**
 * A workflow surface first, an analytics page second (spec 8.3). Every panel
 * leads somewhere; "Create new script" is the single most prominent action.
 */
export default function Dashboard () {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    dashboardApi.get().then(setData).catch(setError)
  }

  useEffect(load, [])

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data) return <Loading label="Loading your dashboard…" />

  const hasScripts = data.totals.scripts > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">Everything you have written, and what to write next.</p>
        </div>
        <Button onClick={() => navigate('/workspace/new')}>New script</Button>
      </div>

      {!user?.hasProfile && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-medium text-violet-900">Set up your creator profile</p>
          <p className="mt-1 text-sm text-violet-800">
            Two minutes once, and every script after it sounds like you instead of like anyone.
          </p>
          <Link to="/profile" className="mt-2 inline-block text-sm font-medium text-violet-900 underline">
            Set it up
          </Link>
        </div>
      )}

      {!hasScripts ? (
        <Card>
          <Empty
            title="No scripts yet"
            action={<Button onClick={() => navigate('/workspace/new')}>Write your first script</Button>}
          >
            Start with a rough idea. You will have a structured, editable draft in one pass.
          </Empty>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Scripts" value={data.totals.scripts} />
            <Stat label="Drafts" value={data.totals.drafts} />
            <Stat label="Saved" value={data.totals.saved} />
            <Stat
              label="Generation success"
              value={data.generationSuccessRate === null ? '—' : `${Math.round(data.generationSuccessRate * 100)}%`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Recently edited">
              {data.recentlyEdited.length === 0
                ? <p className="text-sm text-slate-500">Nothing edited yet.</p>
                : (
                  <ul className="divide-y divide-slate-100">
                    {data.recentlyEdited.map((script) => (
                      <li key={script.scriptId}>
                        <Link to={`/workspace/${script.scriptId}`}
                          className="flex items-center justify-between py-2 text-sm hover:text-app">
                          <span className="truncate pr-3">{script.title}</span>
                          <Badge tone={script.status === 'SAVED' ? 'app' : 'slate'}>{script.status}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
            </Card>

            <Card title="What you write">
              <Breakdown label="By platform" data={data.breakdown.byPlatform} />
              <div className="mt-4">
                <Breakdown label="By content type" data={data.breakdown.byContentType} />
              </div>
            </Card>
          </div>

          <Card title="Generation activity">
            {data.activity.length === 0
              ? <p className="text-sm text-slate-500">No generations in the last two weeks.</p>
              : <Activity rows={data.activity} />}
            <p className="mt-3 text-xs text-slate-500">
              {data.spend.tokens.toLocaleString()} tokens used
              {data.spend.costUsd > 0 ? ` · $${data.spend.costUsd} spent` : ' · no billed spend'}
            </p>
          </Card>
        </>
      )}
    </div>
  )
}

function Stat ({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function Breakdown ({ label, data }) {
  const entries = Object.entries(data ?? {})
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  if (!total) return <p className="text-sm text-slate-500">Nothing yet.</p>

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <ul className="space-y-1.5">
        {entries.sort((a, b) => b[1] - a[1]).map(([key, count]) => (
          <li key={key} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 truncate text-slate-700">{key}</span>
            <span className="h-2 rounded-full bg-app/70" style={{ width: `${(count / total) * 100}%`, minWidth: '4px' }} />
            <span className="text-xs text-slate-500">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Activity ({ rows }) {
  const max = Math.max(...rows.map((r) => r.generations), 1)

  return (
    <div className="flex h-24 items-end gap-1">
      {rows.map((row) => (
        <div key={row.date} className="flex flex-1 flex-col items-center gap-1" title={`${row.date}: ${row.generations}`}>
          <div className="w-full rounded-t bg-ai/70" style={{ height: `${(row.generations / max) * 100}%`, minHeight: '3px' }} />
          <span className="text-[10px] text-slate-400">{row.date.slice(8)}</span>
        </div>
      ))}
    </div>
  )
}
