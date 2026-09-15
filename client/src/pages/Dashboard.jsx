import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboard as dashboardApi } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Empty, ErrorState, Loading, Status } from '../components/ui.jsx'

/**
 * A workflow surface first, an analytics page second (spec 8.3).
 *
 * Which is why there are no chart cards competing for attention: the numbers
 * are set quietly in the same row, and the one loud element on the page is the
 * action that starts a new script.
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
  if (!data) return <Loading label="Loading your dashboard" lines={5} />

  const hasScripts = data.totals.scripts > 0

  return (
    <div className="animate-in space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-content">
            {hasScripts ? 'Welcome back' : 'Let’s write something'}
          </h1>
          <p className="mt-1.5 text-sm text-content-tertiary">
            {hasScripts
              ? 'Pick up where you left off, or start something new.'
              : 'One rough idea is all it takes to get a structured draft.'}
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => navigate('/workspace/new')}>
          New script
        </Button>
      </header>

      {!user?.hasProfile && (
        <Link
          to="/profile"
          className="group block rounded-lg border border-creator/25 bg-creator-soft p-5 transition ease-out hover:border-creator/45"
        >
          <p className="text-sm font-medium text-content">Set up your creator profile</p>
          <p className="mt-1 measure text-sm text-content-secondary">
            Two minutes, once. After that every script sounds like you rather
            than like anyone — it is the single biggest lever on output quality.
          </p>
          <span className="mt-2.5 inline-block text-sm text-creator">
            Set it up
            <span aria-hidden="true" className="ml-1 inline-block transition-transform ease-out group-hover:translate-x-0.5">→</span>
          </span>
        </Link>
      )}

      {!hasScripts ? (
        <Empty
          icon="✎"
          title="Nothing written yet"
          action={<Button variant="primary" size="lg" onClick={() => navigate('/workspace/new')}>Write your first script</Button>}
        >
          Give it an idea, a platform and an objective. You will get back a
          structured draft you can edit section by section.
        </Empty>
      ) : (
        <>
          {/* Numbers inline, hairline-separated. A row of boxed stat cards is
              four rectangles competing with the thing you came here to do. */}
          <section className="grid grid-cols-2 divide-line border-y border-line sm:grid-cols-4 sm:divide-x">
            <Stat label="Scripts" value={data.totals.scripts} />
            <Stat label="Drafts" value={data.totals.drafts} />
            <Stat label="Saved" value={data.totals.saved} />
            <Stat
              label="Generations landed"
              value={data.generationSuccessRate === null ? '—' : `${Math.round(data.generationSuccessRate * 100)}%`}
            />
          </section>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section>
              <h2 className="mb-1 text-sm font-medium text-content">Pick up where you left off</h2>
              <p className="mb-4 text-xs text-content-tertiary">Most recently edited.</p>

              <ul className="divide-y divide-line border-t border-line">
                {data.recentlyEdited.map((script) => (
                  <li key={script.scriptId}>
                    <Link
                      to={`/workspace/${script.scriptId}`}
                      className="group flex items-center gap-4 py-3 transition-colors"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-content transition-colors group-hover:text-accent-text">
                        {script.title}
                      </span>
                      <Status tone={script.status === 'SAVED' ? 'accent' : 'neutral'}>
                        {script.status.toLowerCase().replace('_', ' ')}
                      </Status>
                      <span aria-hidden="true" className="text-content-faint transition-transform ease-out group-hover:translate-x-0.5 group-hover:text-accent">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-8">
              <Breakdown label="Platforms" data={data.breakdown.byPlatform} />
              <Breakdown label="Content types" data={data.breakdown.byContentType} />

              {data.activity.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-content-tertiary">
                    Last two weeks
                  </h3>
                  <Activity rows={data.activity} />
                  <p className="mt-2.5 text-micro text-content-faint">
                    {data.spend.tokens.toLocaleString()} tokens
                    {data.spend.costUsd > 0 ? ` · $${data.spend.costUsd}` : ' · free tier'}
                  </p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Stat ({ label, value }) {
  return (
    <div className="px-1 py-5 sm:px-5 sm:first:pl-0">
      <p className="font-serif text-3xl tabular-nums text-content">{value}</p>
      <p className="mt-0.5 text-xs text-content-tertiary">{label}</p>
    </div>
  )
}

function Breakdown ({ label, data }) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  if (!total) return null

  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-content-tertiary">{label}</h3>
      <ul className="space-y-2">
        {entries.map(([key, count]) => (
          <li key={key} className="flex items-center gap-3 text-xs">
            <span className="w-24 shrink-0 truncate text-content-secondary">{key.replace('_', ' ')}</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <span
                className="block h-full rounded-full bg-accent/70 transition-all duration-500 ease-out"
                style={{ width: `${(count / total) * 100}%` }}
              />
            </span>
            <span className="w-5 shrink-0 text-right tabular-nums text-content-tertiary">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const DAYS = 14

/**
 * The API returns only days that had generations. Rendering those alone makes
 * one busy day fill the entire width and read as a solid block — the chart
 * claims a trend it does not have. So the window is built first and the data
 * dropped into it, which is what "last two weeks" actually means.
 */
function Activity ({ rows }) {
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r.generations]))

  const window = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (DAYS - 1 - i))
    const key = date.toISOString().slice(0, 10)
    return { key, label: key.slice(5), generations: byDate[key] ?? 0 }
  })

  const max = Math.max(...window.map((d) => d.generations), 1)

  return (
    <div className="flex h-16 items-end gap-[3px]" role="img"
      aria-label={`Generations per day over the last ${DAYS} days`}>
      {window.map((day) => (
        <div key={day.key} className="group relative flex h-full flex-1 items-end">
          <div
            className={`w-full rounded-sm transition-colors ${
              day.generations ? 'bg-ai/40 hover:bg-ai/70' : 'bg-surface-sunken'
            }`}
            // Empty days keep a 2px baseline so the axis is legible without a
            // drawn axis line.
            style={{ height: day.generations ? `${(day.generations / max) * 100}%` : '2px' }}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-content px-1.5 py-0.5 text-micro text-bg opacity-0 transition-opacity group-hover:opacity-100">
            {day.generations} on {day.label}
          </span>
        </div>
      ))}
    </div>
  )
}
