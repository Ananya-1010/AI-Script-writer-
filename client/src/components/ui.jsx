/**
 * Shared primitives.
 *
 * The async-state components exist because spec 8.4 requires every async
 * surface to define loading, empty, success and error — and a rule that has to
 * be re-implemented per screen is a rule that gets skipped on the fifth screen.
 */

export function Button ({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-app text-white hover:bg-indigo-700 disabled:bg-slate-300',
    ai: 'bg-ai text-white hover:bg-teal-700 disabled:bg-slate-300',
    ghost: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
    danger: 'bg-white text-danger border border-danger/40 hover:bg-red-50'
  }[variant]

  return (
    <button
      {...props}
      className={`rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
    />
  )
}

export function Field ({ label, hint, error, children, htmlFor }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {/* Each field says in one line how it affects generated scripts. A field
          whose effect cannot be explained does not belong on the form. */}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="text-xs text-danger">{error}</p>
      )}
    </div>
  )
}

export const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-app focus:ring-1 focus:ring-app'

export function Card ({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Loading ({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-500" role="status">
      <span className="h-3 w-3 animate-pulse rounded-full bg-slate-400" aria-hidden="true" />
      {label}
    </div>
  )
}

export function Empty ({ title, children, action }) {
  return (
    <div className="py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/**
 * A failure the creator can act on: plain language, the reason category, and a
 * retry. Never a stack trace, never a raw provider error (spec 8.3).
 */
export function ErrorState ({ error, onRetry }) {
  if (!error) return null

  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-red-50 p-4">
      <p className="text-sm font-medium text-slate-900">{error.message}</p>
      <p className="mt-1 text-xs text-slate-500">
        {error.code}
        {error.correlationId ? ` · ${error.correlationId}` : ''}
      </p>
      {onRetry && error.retryable !== false && (
        <Button variant="ghost" className="mt-3" onClick={onRetry}>Try again</Button>
      )}
    </div>
  )
}

export function Badge ({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    ai: 'bg-teal-50 text-teal-800 border border-teal-200',
    creator: 'bg-violet-50 text-violet-800 border border-violet-200',
    app: 'bg-indigo-50 text-indigo-800',
    warn: 'bg-amber-50 text-amber-800'
  }[tone]

  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tones}`}>{children}</span>
}

export const formatDuration = (seconds) => {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}
