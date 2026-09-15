import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { dashboard as dashboardApi } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Empty, ErrorState, Loading, Status, Counter, Eyebrow, Reveal, Stagger, Item } from '../components/ui.jsx'
import { riseIn } from '../lib/motion.js'

/**
 * A contents page, not an analytics dashboard.
 *
 * The numbers are set as figures in the display face along a single ruled band
 * rather than in four boxes — a row of cards makes statistics look like the
 * point of the page, and they are not. The point is the next script.
 */
export default function Dashboard () {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => { setError(null); dashboardApi.get().then(setData).catch(setError) }
  useEffect(load, [])

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data) return <Loading label="Loading your desk" lines={5} />

  const hasScripts = data.totals.scripts > 0

  return (
    <div className="space-y-16">
      <Stagger gap={0.07} className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-10">
        <Item>
          <Eyebrow>Your desk</Eyebrow>
          <h1 className="display mt-5 text-[clamp(2.4rem,5vw,3.6rem)] text-ink">
            {hasScripts ? <>Pick up where you <span className="italic">left off</span>.</> : <>Let’s write <span className="italic text-pencil">something</span>.</>}
          </h1>
        </Item>
        <Item>
          <Button variant="ink" size="lg" onClick={() => navigate('/workspace/new')}>New script</Button>
        </Item>
      </Stagger>

      {!user?.hasProfile && (
        <Reveal>
          <Link to="/profile" className="group block border-l-2 border-pencil bg-pencil-soft py-6 pl-6 pr-6">
            <p className="display text-lg text-ink">Set up your creator profile</p>
            <p className="measure mt-2 text-base leading-relaxed text-ink-secondary">
              Two minutes, once. After that every script sounds like you rather
              than like anyone — the single biggest lever on output quality.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm text-pencil">
              Set it up
              <span aria-hidden="true" className="transition-transform duration-DEFAULT group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </Reveal>
      )}

      {!hasScripts ? (
        <Empty
          title="Nothing on the desk yet."
          action={<Button variant="ink" size="lg" onClick={() => navigate('/workspace/new')}>Write your first script</Button>}
        >
          Give it an idea, a platform and an objective. You will get back a
          structured draft you can edit section by section.
        </Empty>
      ) : (
        <>
          {/* Figures along one band. Hairlines between, nothing boxed. */}
          <Reveal className="grid grid-cols-2 gap-y-8 border-y border-rule py-8 sm:grid-cols-4">
            <Figure label="Scripts" value={data.totals.scripts} />
            <Figure label="Drafts" value={data.totals.drafts} />
            <Figure label="Saved" value={data.totals.saved} />
            <Figure
              label="Generations landed"
              value={data.generationSuccessRate === null ? '—' : `${Math.round(data.generationSuccessRate * 100)}%`}
            />
          </Reveal>

          <div className="grid gap-16 lg:grid-cols-12">
            <section className="lg:col-span-7">
              <Eyebrow>Recently edited</Eyebrow>

              <Stagger gap={0.05} delay={0.1} className="mt-6 divide-y divide-rule border-t border-rule">
                {data.recentlyEdited.map((script) => (
                  <motion.div key={script.scriptId} variants={riseIn}>
                    <Link to={`/workspace/${script.scriptId}`} className="group flex items-baseline gap-5 py-4">
                      <span className="display min-w-0 flex-1 truncate text-lg text-ink transition-colors duration-DEFAULT group-hover:text-pencil">
                        {script.title}
                      </span>
                      <Status tone={script.status === 'SAVED' ? 'pencil' : 'neutral'}>
                        {script.status.toLowerCase().replace('_', ' ')}
                      </Status>
                      <span aria-hidden="true" className="text-ink-faint transition-transform duration-DEFAULT group-hover:translate-x-1 group-hover:text-pencil">→</span>
                    </Link>
                  </motion.div>
                ))}
              </Stagger>
            </section>

            <section className="space-y-12 lg:col-span-5">
              <Breakdown label="Platforms" data={data.breakdown.byPlatform} />
              <Breakdown label="Content types" data={data.breakdown.byContentType} />

              <div>
                <Eyebrow>Last two weeks</Eyebrow>
                <div className="mt-6"><Activity rows={data.activity} /></div>
                <p className="mt-4 text-xs text-ink-tertiary">
                  <Counter value={data.spend.tokens} /> tokens
                  {data.spend.costUsd > 0 ? ` · $${data.spend.costUsd}` : ' · free tier'}
                </p>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Figure ({ label, value }) {
  return (
    <div>
      <p className="display text-[2.8rem] leading-none text-ink"><Counter value={value} /></p>
      <p className="label mt-3 text-ink-tertiary">{label}</p>
    </div>
  )
}

function Breakdown ({ label, data }) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  if (!total) return null

  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <ul className="mt-5 space-y-3">
        {entries.map(([key, count], i) => (
          <li key={key} className="flex items-center gap-4 text-sm">
            <span className="w-28 shrink-0 truncate text-ink-secondary">{key.replace('_', ' ')}</span>
            <span className="h-[3px] flex-1 bg-ink/8">
              <motion.span
                initial={{ scaleX: 0 }} animate={{ scaleX: count / total }}
                transition={{ type: 'spring', stiffness: 120, damping: 24, delay: 0.2 + i * 0.07 }}
                style={{ transformOrigin: 'left' }}
                className="block h-full bg-pencil"
              />
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums text-ink-tertiary">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const DAYS = 14

/**
 * The API returns only days that had generations. Rendering those alone lets
 * one busy day fill the whole width and read as a solid block — a trend the
 * data does not support. The window is built first, then filled.
 */
function Activity ({ rows }) {
  const byDate = Object.fromEntries((rows ?? []).map((r) => [r.date, r.generations]))

  const window = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (DAYS - 1 - i))
    const key = date.toISOString().slice(0, 10)
    return { key, label: key.slice(5), generations: byDate[key] ?? 0 }
  })

  const max = Math.max(...window.map((d) => d.generations), 1)

  return (
    <div className="flex h-20 items-end gap-1.5" role="img" aria-label={`Generations per day over ${DAYS} days`}>
      {window.map((day, i) => (
        <div key={day.key} className="group relative flex h-full flex-1 items-end">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: day.generations ? `${(day.generations / max) * 100}%` : '2px' }}
            transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.25 + i * 0.025 }}
            className={`w-full ${day.generations ? 'bg-pencil' : 'bg-ink/12'}`}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-micro tracking-normal text-paper opacity-0 transition-opacity group-hover:opacity-100">
            {day.generations} on {day.label}
          </span>
        </div>
      ))}
    </div>
  )
}
