import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { resolveTheme, toggleTheme } from '../state/theme.js'
import { spring, springSnap, riseIn, stagger, ease } from '../lib/motion.js'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* ---------------------------------------------------------------- Aura -- */

/** The living colour field. Mounted once, behind everything. */
export function Aura () {
  return <div className="aura" aria-hidden="true"><span /></div>
}

/* -------------------------------------------------------------- Button -- */

const VARIANTS = {
  primary: `
    text-white
    bg-gradient-to-b from-accent to-accent-hover
    shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.28),0_1px_2px_hsl(240_30%_20%/0.2),0_8px_24px_-8px_hsl(var(--accent-glow))]
    hover:shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.34),0_2px_4px_hsl(240_30%_20%/0.22),0_14px_34px_-8px_hsl(var(--accent-glow))]
    disabled:from-content-faint disabled:to-content-faint disabled:shadow-none
  `,
  glass: `
    glass text-content
    hover:bg-[hsl(var(--glass-fill-strong))]
    disabled:text-content-faint
  `,
  ghost: 'text-content-secondary hover:text-content hover:bg-[hsl(var(--text)/0.05)] disabled:text-content-faint',
  danger: 'text-danger hover:bg-danger-soft disabled:text-content-faint'
}

const SIZES = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-md gap-2 rounded-xl'
}

export function Button ({ variant = 'glass', size = 'md', className, sheen = false, ...props }) {
  return (
    <motion.button
      whileTap={props.disabled ? undefined : { scale: 0.975 }}
      transition={springSnap}
      {...props}
      className={cx(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background,box-shadow,color] duration-300 ease-out',
        'disabled:pointer-events-none',
        sheen && 'sheen',
        VARIANTS[variant], SIZES[size], className
      )}
    />
  )
}

/* --------------------------------------------------------------- Input -- */

export const inputClass = cx(
  'w-full rounded-[10px] px-3 py-2 text-sm text-content',
  'bg-[hsl(var(--surface)/0.6)] backdrop-blur-sm',
  'border border-[hsl(var(--glass-border))]',
  'shadow-[inset_0_1px_2px_hsl(240_30%_20%/0.04)]',
  'placeholder:text-content-faint',
  'transition-[border-color,box-shadow,background] duration-300 ease-out',
  'hover:border-line-strong',
  'focus:border-accent/60 focus:outline-none focus:bg-[hsl(var(--surface)/0.9)]',
  'focus:shadow-[inset_0_1px_2px_hsl(240_30%_20%/0.04),0_0_0_4px_hsl(var(--accent)/0.12)]'
)

export function Field ({ label, hint, error, children, htmlFor, aside }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-content">{label}</label>
        {aside}
      </div>
      {children}
      {hint && !error && <p className="text-xs leading-relaxed text-content-tertiary">{hint}</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  )
}

/* --------------------------------------------------------------- Panel -- */

export function Panel ({ title, action, children, className, hover = false }) {
  return (
    <motion.section
      whileHover={hover ? { y: -3, transition: spring } : undefined}
      className={cx('glass rounded-2xl', hover && 'sheen cursor-pointer', className)}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          {title && (
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-content-tertiary">{title}</h2>
          )}
          {action}
        </header>
      )}
      <div className={cx('px-5 pb-5', !title && 'pt-5')}>{children}</div>
    </motion.section>
  )
}

/* -------------------------------------------------------------- Reveal -- */

/** Rises into place the first time it scrolls into view. Once, never again —
    re-animating on every scroll pass is the fastest way to make motion annoying. */
export function Reveal ({ children, delay = 0, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
        show: {
          opacity: 1, y: 0, filter: 'blur(0px)',
          transition: { type: 'spring', stiffness: 200, damping: 28, delay }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Stagger ({ children, gap, delay, className }) {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger(gap, delay)} className={className}>
      {children}
    </motion.div>
  )
}

export function Item ({ children, className }) {
  return <motion.div variants={riseIn} className={className}>{children}</motion.div>
}

/* -------------------------------------------------------------- Number -- */

/**
 * Counts up to its value on mount.
 *
 * A number that arrives at its figure reads as measured; a number that is just
 * printed reads as static. Uses a spring so it decelerates into place instead
 * of ticking linearly.
 */
export function Counter ({ value, className }) {
  const numeric = typeof value === 'number'
  const mv = useMotionValue(0)
  const springy = useSpring(mv, { stiffness: 90, damping: 22, mass: 0.8 })
  const rounded = useTransform(springy, (v) => Math.round(v).toLocaleString())

  useEffect(() => { if (numeric) mv.set(value) }, [value, numeric, mv])

  if (!numeric) return <span className={className}>{value}</span>
  return <motion.span className={className}>{rounded}</motion.span>
}

/* -------------------------------------------------------- Async states -- */

export function Skeleton ({ className }) {
  return (
    <div className={cx('relative overflow-hidden rounded-lg bg-[hsl(var(--text)/0.05)]', className)}>
      <div className="absolute inset-y-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-[hsl(var(--text)/0.07)] to-transparent" />
    </div>
  )
}

export function Loading ({ label = 'Loading', lines = 3 }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-4', i === lines - 1 ? 'w-2/5' : i % 2 ? 'w-4/5' : 'w-full')} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function Empty ({ icon, title, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={ease}
      className="px-6 py-16 text-center"
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.1 }}
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl glass text-xl text-content-tertiary"
          aria-hidden="true"
        >
          {icon}
        </motion.div>
      )}
      <p className="display text-xl text-content">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-content-tertiary">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </motion.div>
  )
}

export function ErrorState ({ error, onRetry, className }) {
  if (!error) return null

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className={cx('glass rounded-2xl border-danger/25 p-4', className)}
    >
      <div className="flex gap-3">
        <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">!</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-content">{error.message}</p>
          <p className="mt-1 font-mono text-[11px] text-content-tertiary">
            {error.code}{error.correlationId ? ` · ${error.correlationId}` : ''}
          </p>
          {onRetry && error.retryable !== false && (
            <Button size="sm" variant="glass" className="mt-3" onClick={onRetry}>Try again</Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ----------------------------------------------------------------- Bits -- */

const TONES = {
  neutral: 'text-content-tertiary bg-[hsl(var(--text)/0.06)]',
  accent: 'text-accent-text bg-accent-soft',
  ai: 'text-ai bg-ai-soft',
  creator: 'text-creator bg-creator-soft',
  warn: 'text-warn bg-warn-soft',
  danger: 'text-danger bg-danger-soft'
}

export function Tag ({ tone = 'neutral', className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', TONES[tone], className)}>
      {children}
    </span>
  )
}

export function Status ({ children, tone = 'neutral', pulse = false }) {
  const dot = { neutral: 'bg-content-faint', accent: 'bg-accent', ai: 'bg-ai', warn: 'bg-warn' }[tone]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-content-tertiary">
      <span aria-hidden="true" className="relative grid h-2 w-2 place-items-center">
        {pulse && <span className={cx('absolute h-2 w-2 animate-ping rounded-full opacity-60', dot)} />}
        <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />
      </span>
      {children}
    </span>
  )
}

export function ThemeToggle () {
  const [theme, setTheme] = useState('light')
  useEffect(() => setTheme(resolveTheme()), [])
  const dark = theme === 'dark'

  return (
    <Button
      size="sm" variant="ghost"
      aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
      onClick={() => setTheme(toggleTheme())}
      className="!px-2"
    >
      <motion.svg
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={spring}
        viewBox="0 0 16 16" className="h-4 w-4" fill="none"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"
      >
        {dark
          ? <path d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
          : (
            <>
              <circle cx="8" cy="8" r="3.1" />
              <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" />
            </>
          )}
      </motion.svg>
    </Button>
  )
}

/* --------------------------------------------------------------- Format -- */

export const formatDuration = (seconds) => {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}

export const countWords = (text) => (text ?? '').trim().split(/\s+/).filter(Boolean).length
