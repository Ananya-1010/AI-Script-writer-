import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Field, inputClass, ErrorState, ThemeToggle, Aura } from '../components/ui.jsx'
import { spring, springSoft, stagger } from '../lib/motion.js'

/**
 * The first screen decides whether this feels like software worth writing in.
 *
 * The headline is set in the serif the scripts themselves use and revealed a
 * line at a time, so the first thing anyone sees is the typography they will be
 * working in. The form floats as glass over the living field — which is the
 * whole point of the field: translucency is invisible without something moving
 * behind it.
 */

const HEADLINE = ['Turn your idea', 'into a script that', 'sounds like you.']

const line = {
  hidden: { opacity: 0, y: 26, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springSoft }
}

function AuthShell ({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen overflow-hidden lg:grid lg:grid-cols-[1.05fr_1fr]">
      <Aura />

      {/* --------------------------------------------------------- stage -- */}
      <aside className="relative hidden flex-col justify-center overflow-hidden p-12 xl:p-16 lg:flex">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          className="absolute left-12 top-12 flex items-center gap-2.5 xl:left-16 xl:top-16"
        >
          <Mark />
          <span className="text-sm font-medium text-content">AI Script Writer</span>
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={stagger(0.11, 0.15)} className="relative max-w-xl">
          <h1 className="display text-[clamp(2.6rem,4.4vw,3.9rem)] text-content">
            {HEADLINE.map((text, i) => (
              <motion.span key={text} variants={line} className="block">
                {i === HEADLINE.length - 1
                  ? <span className="text-gradient">{text}</span>
                  : text}
              </motion.span>
            ))}
          </h1>

          <motion.p variants={line} className="mt-7 max-w-md text-[15px] leading-relaxed text-content-secondary">
            Not a chat box. Your context, your knowledge, a real structure, and
            refinement that keeps what you already approved.
          </motion.p>

          <motion.ul variants={stagger(0.08, 0.5)} initial="hidden" animate="show" className="mt-10 space-y-3">
            {[
              ['A structured draft in one pass', 'Never a blank page.'],
              ['Every section editable', 'Marked as yours or the model’s.'],
              ['Refinements that hold your objective', 'Nothing drifts.']
            ].map(([head, sub]) => (
              <motion.li key={head} variants={line} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-accent to-ai" />
                <span className="text-sm text-content-secondary">
                  {head} <span className="text-content-tertiary">{sub}</span>
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </aside>

      {/* ---------------------------------------------------------- form -- */}
      <div className="relative flex min-h-screen items-center justify-center px-5 py-14">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>

        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring, delay: 0.1 }}
          className="glass-strong w-full max-w-sm rounded-3xl p-8"
        >
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <Mark /><span className="text-sm font-medium text-content">AI Script Writer</span>
          </div>

          <h2 className="display text-2xl text-content">{title}</h2>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-content-tertiary">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          <p className="mt-6 text-sm text-content-tertiary">{footer}</p>
        </motion.div>
      </div>
    </div>
  )
}

function Mark () {
  return (
    <span
      aria-hidden="true"
      className="grid h-7 w-7 place-items-center rounded-[9px] bg-gradient-to-br from-accent to-creator text-[11px] font-medium text-white shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.35),0_4px_12px_-2px_hsl(var(--accent-glow))]"
    >
      A
    </span>
  )
}

const link = 'text-accent-text underline-offset-4 transition hover:underline'

export function Login () {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setError(null)
    try { await login(form); navigate('/') } catch (err) { setError(err) } finally { setBusy(false) }
  }

  return (
    <AuthShell title="Welcome back" footer={<>No account yet? <Link className={link} to="/register">Create one</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" required autoComplete="email" autoFocus className={inputClass}
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" required autoComplete="current-password" className={inputClass}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        <ErrorState error={error} />

        <Button type="submit" variant="primary" size="lg" sheen disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}

export function Register () {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setError(null)
    try { await register(form); navigate('/profile') } catch (err) { setError(err) } finally { setBusy(false) }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Your scripts, profile and knowledge stay private to you."
      footer={<>Already have one? <Link className={link} to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" htmlFor="name">
          <input id="name" required autoComplete="name" autoFocus className={inputClass}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" required autoComplete="email" className={inputClass}
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" hint="At least 10 characters. Length beats symbols." htmlFor="password">
          <input id="password" type="password" required minLength={10} autoComplete="new-password" className={inputClass}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        <ErrorState error={error} />

        <Button type="submit" variant="primary" size="lg" sheen disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
