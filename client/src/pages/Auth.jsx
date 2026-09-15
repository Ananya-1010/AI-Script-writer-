import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Field, inputClass, ErrorState, ThemeToggle } from '../components/ui.jsx'

/**
 * Two panes. The left states what the product is, in the product's own voice
 * and in the serif the scripts are set in — so the first thing a creator sees
 * is the typography they will be writing in. The right is the form, and
 * nothing else.
 */
function AuthShell ({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* The headline block is centred as one unit rather than spread with
          justify-between. Spreading three unequal blocks across a tall viewport
          leaves two large voids and reads as an unfinished page. */}
      <aside className="relative hidden flex-col overflow-hidden border-r border-line bg-surface-sunken p-10 lg:flex">
        {/* A single soft accent wash. One gradient, low opacity, behind
            everything — not a decorated card. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/[0.07] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-ai/[0.06] blur-3xl"
        />

        <div className="relative flex items-center gap-2 text-sm text-content-secondary">
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-sm bg-accent text-[10px] text-white">A</span>
          AI Script Writer
        </div>

        <div className="relative flex flex-1 flex-col justify-center py-10">
          <p className="max-w-md font-serif text-3xl leading-[1.15] text-content">
            Turn your idea into a script that fits your platform, audience,
            purpose, and&nbsp;voice.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-content-tertiary">
            Not a chat box. Your context, your knowledge, a real structure, and
            refinement that keeps what you already approved. You stay the author
            the whole way through.
          </p>

          <ul className="mt-9 space-y-2.5 text-sm text-content-tertiary">
            {[
              'A structured draft in one pass, never a blank page',
              'Every section editable, and marked as yours or the model’s',
              'Refinements that preserve your original objective'
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>

        <div className="w-full max-w-[21rem] animate-in">
          <h1 className="text-xl text-content">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-content-tertiary">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          <p className="mt-6 text-sm text-content-tertiary">{footer}</p>
        </div>
      </div>
    </div>
  )
}

const link = 'text-accent-text underline-offset-4 hover:underline'

export function Login () {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setError(null)
    try {
      await login(form)
      navigate('/')
    } catch (err) { setError(err) } finally { setBusy(false) }
  }

  return (
    <AuthShell
      title="Welcome back"
      footer={<>No account yet? <Link className={link} to="/register">Create one</Link></>}
    >
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

        <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
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
    try {
      await register(form)
      // Straight to the profile: it is the largest single lever on output
      // quality, and this is the one moment a creator expects setup.
      navigate('/profile')
    } catch (err) { setError(err) } finally { setBusy(false) }
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

        <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
