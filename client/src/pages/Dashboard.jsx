import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { dashboard as dashboardApi } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Empty, ErrorState, Loading, Status, Counter, Stagger, Item, Reveal } from '../components/ui.jsx'
import { spring, riseIn } from '../lib/motion.js'

export default function Dashboard () {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => { setError(null); dashboardApi.get().then(setData).catch(setError) }
  useEffect(load, [])

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data) return <Loading label="Loading your dashboard" lines={5} />

  const hasScripts = data.totals.scripts > 0

  return (
    <div className="space-y-14">
      <Stagger gap={0.07} className="flex flex-wrap items-end justify-between gap-5">
        <Item>
          <h1 className="display text-[clamp(2.1rem,3.6vw,2.9rem)] text-content">
            {hasScripts ? <>Welcome <span className="text-gradient">back</span></> : <>Let’s write <span className="text-gradient">something</span></>}
          </h1>
          <p className="mt-2 text-[15px] text-content-tertiary">
            {hasScripts ? 'Pick up where you left off, or start something new.' : 'One rough idea is all it takes.'}
          </p>
        </Item>
        <Item>
          <Button variant="primary" size="lg" sheen onClick={() => navigate('/workspace/new')}>
            New script
          </Button>
        </Item>
      </Stagger>

      {!user?.hasProfile && (
        <Reveal>
          <motion.div whileHover={{ y: -3 }} transition={spring}>
            <Link to="/profile" className="sheen group block overflow-hidden rounded-2xl glass p-6">
              <div className="flex items-start gap-4">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-creator to-accent text-white shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.3)]">◈</span>
                <div>
                  <p className="text-[15px] font-medium text-content">Set up your creator profile</p>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-content-tertiary">
                    Two minutes, once. After that every script sounds like you rather than
                    like anyone — the single biggest lever on output quality.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-creator">
                    Set it up
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        </Reveal>
      )}

      {!hasScripts ? (
        <Empty
          icon="✎"
          title="Nothing written yet"
          action={<Button variant="primary" size="lg" sheen onClick={() => navigate('/workspace/new')}>Write your first script</Button>}
        >
          Give it an idea, a platform and an objective. You will get back a
          structured draft you can edit section by section.
        </Empty>
      ) : (
        <>
          <Stagger gap={0.06} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Scripts" value={data.totals.scripts} />
            <Stat label="Drafts" value={data.totals.drafts} />
            <Stat label="Saved" value={data.totals.saved} />
            <Stat
              label="Generations landed"
              value={data.generationSuccessRate === null ? '—' : `${Math.round(data.generationSuccessRate * 100)}%`}
            />
          </Stagger>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Reveal className="glass rounded-2xl p-6">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-content-tertiary">
                Pick up where you left off
              </h2>

              <Stagger gap={0.05} delay={0.1} className="mt-4 space-y-1">
                {data.recentlyEdited.map((script) => (
                  <motion.div key={script.scriptId} variants={riseIn}>
                    <motion.div whileHover={{ x: 4 }} transition={spring}>
                      <Link
                        to={`/workspace/${script.scriptId}`}
                        className="group flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-[hsl(var(--text)/0.04)]"
                      >
                        <span className="min-w-0 flex-1 truncate text-[15px] text-content">{script.title}</span>
                        <Status tone={script.status === 'SAVED' ? 'accent' : 'neutral'}>
                          {script.status.toLowerCase().replace('_', ' ')}
                        </Status>
                        <span aria-hidden="true" className="text-content-faint transition group-hover:translate-x-0.5 group-hover:text-accent">→</span>
                      </Link>
                    </motion.div>
                  </motion.div>
                ))}
              </Stagger>
            </Reveal>

            <Reveal delay={0.08} className="glass space-y-7 rounded-2xl p-6">
              <Breakdown label="Platforms" data={data.breakdown.byPlatform} tone="accent" />
              <Breakdown label="Content types" data={data.breakdown.byContentType} tone="ai" />

              <div>
                <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-content-tertiary">Last two weeks</h3>
                <Activity rows={data.activity} />
                <p className="mt-3 text-[11px] text-content-faint">
                  <Counter value={data.spend.tokens} /> tokens
                  {data.spend.costUsd > 0 ? ` · $${data.spend.costUsd}` : ' · free tier'}
                </p>
              </div>
            </Reveal>
          </div>
        </>
      )}
    </div>
  )
}

function Stat ({ label, value }) {
  return (
    <motion.div variants={riseIn} whileHover={{ y: -4 }} transition={spring}>
      <div className="sheen h-full overflow-hidden rounded-2xl glass px-5 py-6">
        <p className="display text-[2.6rem] leading-none text-content">
          <Counter value={value} />
        </p>
        <p className="mt-2.5 text-xs text-content-tertiary">{label}</p>
      </div>
    </motion.div>
  )
}

function Breakdown ({ label, data, tone }) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  if (!total) return null

  const bar = tone === 'ai'
    ? 'from-ai to-ai/40'
    : 'from-accent to-creator/60'

  return (
    <div>
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-content-tertiary">{label}</h3>
      <ul className="space-y-2.5">
        {entries.map(([key, count], i) => (
          <li key={key} className="flex items-center gap-3 text-xs">
            <span className="w-24 shrink-0 truncate text-content-secondary">{key.replace('_', ' ')}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--text)/0.07)]">
              <motion.span
                initial={{ scaleX: 0 }} animate={{ scaleX: count / total }}
                transition={{ type: 'spring', stiffness: 120, damping: 24, delay: 0.25 + i * 0.07 }}
                style={{ transformOrigin: 'left' }}
                className={`block h-full rounded-full bg-gradient-to-r ${bar}`}
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
 * The API returns only days that had generations. Rendering those alone lets
 * one busy day fill the whole width and read as a solid block — the chart would
 * claim a trend it does not have. The window is built first, then filled.
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
    <div className="flex h-20 items-end gap-1" role="img" aria-label={`Generations per day over ${DAYS} days`}>
      {window.map((day, i) => (
        <div key={day.key} className="group relative flex h-full flex-1 items-end">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: day.generations ? `${(day.generations / max) * 100}%` : '3px' }}
            transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.3 + i * 0.025 }}
            className={`w-full rounded-md transition-colors ${
              day.generations
                ? 'bg-gradient-to-t from-ai/30 to-ai group-hover:from-ai/50 group-hover:to-ai'
                : 'bg-[hsl(var(--text)/0.07)]'
            }`}
          />
          <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg glass px-2 py-1 text-[11px] text-content opacity-0 transition-opacity group-hover:opacity-100">
            {day.generations} on {day.label}
          </span>
        </div>
      ))}
    </div>
  )
}
