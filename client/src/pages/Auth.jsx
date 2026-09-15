import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, Field, inputClass, ErrorState } from '../components/ui.jsx'

function AuthShell ({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-app">AI Script Writer</h1>
        <p className="mt-1 text-sm text-slate-600">
          Turn your idea into a script that fits your platform, audience, purpose, and voice.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </div>

        <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </div>
  )
}

export function Login () {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(form)
      navigate('/')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      footer={<>No account yet? <Link className="text-app underline" to="/register">Create one</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" required autoComplete="email" className={inputClass}
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>

        <Field label="Password" htmlFor="password">
          <input id="password" type="password" required autoComplete="current-password" className={inputClass}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        <ErrorState error={error} />
        <Button type="submit" disabled={busy} className="w-full">
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
    setBusy(true)
    setError(null)
    try {
      await register(form)
      // Straight to the profile: it is the single biggest lever on output
      // quality, and asking for it now is the one moment the creator expects
      // setup (spec 1.6).
      navigate('/profile')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle="Your scripts, profile and knowledge stay private to you."
      footer={<>Already have one? <Link className="text-app underline" to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" htmlFor="name">
          <input id="name" required autoComplete="name" className={inputClass}
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
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
