import { useEffect, useState } from 'react'
import { resolveTheme, toggleTheme } from '../state/theme.js'

/* ==========================================================================
   Primitives.

   Deliberately few. Every component here earns its place by being used on at
   least three screens; anything used once lives with the screen that uses it.
   ========================================================================== */

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* --------------------------------------------------------------- Button -- */

const BUTTON_VARIANTS = {
  // One primary action per view. That is the whole reason the accent stays
  // unused everywhere else.
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm disabled:bg-content-faint disabled:shadow-none',
  secondary: 'bg-surface text-content hairline hover:bg-surface-raised hover:border-line-strong disabled:text-content-faint',
  ghost: 'text-content-secondary hover:text-content hover:bg-surface-sunken disabled:text-content-faint',
  danger: 'text-danger hover:bg-danger-soft disabled:text-content-faint'
}

const BUTTON_SIZES = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-sm',
  md: 'h-8 px-3 text-sm gap-2 rounded',
  lg: 'h-10 px-4 text-md gap-2 rounded-md'
}

export function Button ({ variant = 'secondary', size = 'md', className, ...props }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition ease-out active:translate-y-px',
        'disabled:pointer-events-none disabled:active:translate-y-0',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
    />
  )
}

/* ---------------------------------------------------------------- Input -- */

export const inputClass = cx(
  'w-full rounded bg-surface px-2.5 py-1.5 text-sm text-content hairline',
  'placeholder:text-content-faint',
  'transition ease-out',
  'hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
)

/**
 * The hint is not decoration. Spec 8.3: every field states in one line how it
 * affects generated output, and a field whose effect cannot be explained does
 * not belong on the form.
 */
export function Field ({ label, hint, error, children, htmlFor, aside }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-content">{label}</label>
        {aside}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-content-tertiary">{hint}</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  )
}

/* ----------------------------------------------------------------- Panel -- */

/**
 * No box-in-box. A panel is a hairline and a surface; nested panels get
 * `bare` so sections read as one object rather than a stack of cards.
 */
export function Panel ({ title, action, children, className, bare = false, padded = true }) {
  return (
    <section className={cx(!bare && 'rounded-lg surface hairline shadow-sm', className)}>
      {(title || action) && (
        <header className={cx('flex items-center justify-between gap-3', padded && 'px-4 pt-3.5 pb-2')}>
          {title && (
            <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-content-tertiary">
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className={cx(padded && 'px-4 pb-4', !title && padded && 'pt-4')}>{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------ Async states -- */

/**
 * A skeleton rather than a spinner. A spinner says "something is happening";
 * a skeleton says "this much content is coming, in this shape", which stops
 * the layout jumping when it lands.
 */
export function Skeleton ({ className }) {
  return (
    <div className={cx('relative overflow-hidden rounded bg-surface-sunken', className)}>
      <div className="absolute inset-y-0 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-black/[0.035] to-transparent dark:via-white/[0.05]" />
    </div>
  )
}

export function Loading ({ label = 'Loading', lines = 3 }) {
  return (
    <div role="status" aria-label={label} className="space-y-2.5 py-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-4', i === lines - 1 ? 'w-2/5' : i % 2 ? 'w-4/5' : 'w-full')} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function Empty ({ icon, title, children, action }) {
  return (
    <div className="animate-in px-6 py-14 text-center">
      {icon && <div className="mb-3 text-2xl text-content-faint" aria-hidden="true">{icon}</div>}
      <p className="text-md font-medium text-content">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-sm text-sm text-content-tertiary">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

/**
 * Plain language, the reason category, and a retry. Never a stack trace, never
 * a raw provider error (spec 8.3). The code is present but demoted — it is for
 * the bug report, not for the creator.
 */
export function ErrorState ({ error, onRetry, className }) {
  if (!error) return null

  return (
    <div role="alert" className={cx('animate-in rounded-md border border-danger/25 bg-danger-soft p-3.5', className)}>
      <div className="flex gap-2.5">
        <span aria-hidden="true" className="mt-px text-danger">âš </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-content">{error.message}</p>
          <p className="mt-1 font-mono text-micro text-content-tertiary">
            {error.code}{error.correlationId ? ` · ${error.correlationId}` : ''}
          </p>
          {onRetry && error.retryable !== false && (
            <Button size="sm" variant="secondary" className="mt-2.5" onClick={onRetry}>Try again</Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Bits -- */

const TAG_TONES = {
  neutral: 'text-content-tertiary bg-surface-sunken',
  accent: 'text-accent-text bg-accent-soft',
  ai: 'text-ai bg-ai-soft',
  creator: 'text-creator bg-creator-soft',
  warn: 'text-warn bg-warn-soft',
  danger: 'text-danger bg-danger-soft'
}

export function Tag ({ tone = 'neutral', className, children }) {
  return (
    <span className={cx(
      'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-micro font-medium',
      TAG_TONES[tone], className
    )}>
      {children}
    </span>
  )
}

/** A quiet status word, not a badge. Statuses are context, not decoration. */
export function Status ({ children, tone = 'neutral' }) {
  const dot = { neutral: 'bg-content-faint', accent: 'bg-accent', ai: 'bg-ai', warn: 'bg-warn' }[tone]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-content-tertiary">
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', dot)} />
      {children}
    </span>
  )
}

export function ThemeToggle () {
  const [theme, setTheme] = useState('light')
  useEffect(() => setTheme(resolveTheme()), [])

  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      onClick={() => setTheme(toggleTheme())}
    >
      {/* Drawn, not typed. A glyph like ☀ renders at a different size and
          baseline in every font on every OS, and it is exactly the kind of
          detail that makes a toolbar look assembled rather than designed. */}
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        {theme === 'dark' ? (
          <path d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
        ) : (
          <>
            <circle cx="8" cy="8" r="3.1" />
            <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" />
          </>
        )}
      </svg>
    </Button>
  )
}

/* ---------------------------------------------------------------- Format -- */

export const formatDuration = (seconds) => {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}

export const countWords = (text) => (text ?? '').trim().split(/\s+/).filter(Boolean).length
