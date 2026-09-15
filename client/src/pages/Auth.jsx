import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Field, inputClass, ErrorState, ThemeToggle, Wordmark, Eyebrow } from '../components/ui.jsx'
import { stagger, springSoft } from '../lib/motion.js'

/**
 * Two columns of stock. The left is the masthead of the piece — a pull-quote
 * set in the display face; the right is the form, ruled rather than boxed.
 * No card floats and nothing glows: this is a page you write on.
 */

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: springSoft }
}

function AuthShell ({ title, standfirst, children, footer }) {
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between border-r border-rule bg-paper-deep p-10 lg:flex lg:p-14">
        <Link to="/"><Wordmark className="!text-xl" /></Link>

        <motion.div initial="hidden" animate="show" variants={stagger(0.1, 0.1)} className="max-w-md">
          <motion.div variants={rise}>
            <Eyebrow>The premise</Eyebrow>
          </motion.div>

          <motion.p variants={rise} className="display display-tight mt-7 text-[clamp(2.4rem,4.4vw,3.6rem)] text-ink">
            A blank page is not a writing problem. It is a
            <span className="italic text-brass"> structure </span>
            problem.
          </motion.p>

          <motion.p variants={rise} className="mt-8 text-base leading-relaxed text-ink-secondary">
            Your context, your knowledge, a real structure, and refinements that
            keep what you already approved. You stay the author throughout.
          </motion.p>
        </motion.div>

        <p className="text-xs text-ink-tertiary">
          Scripts, profile and knowledge stay private to your account.
        </p>
      </aside>

      <div className="relative flex min-h-screen items-center justify-center px-6 py-16">
        <div className="absolute right-6 top-6"><ThemeToggle /></div>

        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
          className="w-full max-w-sm"
        >
          <div className="mb-10 lg:hidden"><Link to="/"><Wordmark className="!text-xl" /></Link></div>

          <h1 className="display text-2xl text-ink">{title}</h1>
          {standfirst && <p className="mt-2 text-sm leading-relaxed text-ink-tertiary">{standfirst}</p>}

          <div className="mt-10">{children}</div>

          <p className="mt-8 border-t border-rule pt-5 text-sm text-ink-tertiary">{footer}</p>
        </motion.div>
      </div>
    </div>
  )
}

const link = 'stroke-link text-ink'

export function Login () {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setError(null)
    try { await login(form); navigate('/dashboard') } catch (err) { setError(err) } finally { setBusy(false) }
  }

  return (
    <AuthShell title="Welcome back" footer={<>No account yet? <Link className={link} to="/register">Create one</Link></>}>
      <form onSubmit={submit} className="space-y-7">
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" required autoComplete="email" autoFocus className={inputClass}
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" required autoComplete="current-password" className={inputClass}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        <ErrorState error={error} />

        <Button type="submit" variant="ink" size="lg" disabled={busy} className="w-full">
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
      standfirst="Two minutes of setup, then every script carries your voice."
      footer={<>Already have one? <Link className={link} to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-7">
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

        <Button type="submit" variant="ink" size="lg" disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
