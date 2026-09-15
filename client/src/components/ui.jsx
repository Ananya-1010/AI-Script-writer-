import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { resolveTheme, toggleTheme } from '../state/theme.js'
import { spring, springSnap, riseIn, stagger, ease } from '../lib/motion.js'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* -------------------------------------------------------------- Button -- */

const VARIANTS = {
  /* The red pencil. One of these per view, and nowhere else. */
  ink: `
    bg-ink text-paper
    hover:bg-pencil
    disabled:bg-ink-faint disabled:text-paper
  `,
  pencil: `
    bg-pencil text-white
    hover:bg-pencil-deep
    disabled:bg-ink-faint
  `,
  outline: `
    border border-rule-strong text-ink bg-transparent
    hover:border-ink hover:bg-ink hover:text-paper
    disabled:border-rule disabled:text-ink-faint disabled:hover:bg-transparent disabled:hover:text-ink-faint
  `,
  quiet: 'text-ink-secondary hover:text-ink disabled:text-ink-faint',
  danger: 'text-pencil hover:bg-pencil-soft disabled:text-ink-faint'
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5'
}

export function Button ({ variant = 'outline', size = 'md', className, ...props }) {
  return (
    <motion.button
      whileTap={props.disabled ? undefined : { scale: 0.98 }}
      transition={springSnap}
      {...props}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-sm font-medium',
        'transition-colors duration-DEFAULT ease-out disabled:pointer-events-none',
        VARIANTS[variant], SIZES[size], className
      )}
    />
  )
}

/* --------------------------------------------------------------- Input -- */

/**
 * A ruled line, not a box. Boxes make a page look like a form; a baseline rule
 * makes it look like something you write on. The rule thickens and takes the
 * pencil colour on focus.
 */
export const inputClass = cx(
  'w-full rounded-none border-0 border-b bg-transparent px-0 py-2 text-base text-ink',
  'border-rule-strong placeholder:text-ink-faint',
  'transition-[border-color,box-shadow] duration-DEFAULT ease-out',
  'hover:border-ink-tertiary',
  'focus:border-pencil focus:outline-none focus:shadow-[0_1px_0_0_hsl(var(--pencil))]'
)

export function Field ({ label, hint, error, children, htmlFor, aside }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="label text-ink-tertiary">{label}</label>
        {aside}
      </div>
      {children}
      {hint && !error && <p className="pt-1.5 text-xs leading-relaxed text-ink-tertiary">{hint}</p>}
      {error && <p role="alert" className="pt-1.5 text-xs text-pencil">{error}</p>}
    </div>
  )
}

/* -------------------------------------------------------------- Select -- */

/**
 * A listbox, because a native <select> cannot be styled.
 *
 * Browsers render the closed control and the open menu with OS chrome — a grey
 * capsule, a system arrow, a white popup — none of which belong to this
 * palette. On a page made of paper and hairlines a native select is the single
 * most obvious "unstyled HTML" tell.
 *
 * Keyboard: Enter/Space opens, Escape closes and returns focus, arrows move
 * through options, Home/End jump. Click-outside closes.
 */
export function Select ({ value, onChange, options, placeholder = 'Any', label, className }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef(null)

  const items = [{ value: '', label: placeholder }, ...options]
  const selected = items.find((o) => o.value === value) ?? items[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) setActive(Math.max(0, items.findIndex((o) => o.value === value)))
  }, [open])

  const commit = (option) => { onChange(option.value); setOpen(false) }

  const onKeyDown = (event) => {
    if (!open && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault(); setOpen(true); return
    }
    if (!open) return

    if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0) }
    else if (event.key === 'End') { event.preventDefault(); setActive(items.length - 1) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); commit(items[active]) }
  }

  return (
    <div ref={root} className={cx('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cx(
          'flex h-9 w-full items-center gap-2 border-b px-0 text-sm transition-colors duration-DEFAULT',
          open ? 'border-pencil text-ink' : 'border-rule-strong hover:border-ink-tertiary',
          value ? 'text-ink' : 'text-ink-tertiary'
        )}
      >
        <span className="truncate">{selected.label}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }} transition={spring}
          viewBox="0 0 10 6" className="ml-auto h-1.5 w-2.5 shrink-0" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox" aria-label={label}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto border border-rule bg-paper-raised py-1 shadow-lg"
          >
            {items.map((option, i) => (
              <li key={option.value || '_'} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(option)}
                  className={cx(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                    i === active ? 'bg-ink text-paper' : 'text-ink-secondary'
                  )}
                >
                  <span className={cx('h-1 w-1 shrink-0 rounded-full', option.value === value ? 'bg-pencil' : 'bg-transparent')} />
                  {option.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------- Confirm -- */

/**
 * window.confirm draws an OS dialog with the page's origin in it. It is the
 * loudest possible break in a designed interface, and it cannot be styled.
 */
export function Confirm ({ open, title, body, confirmLabel = 'Delete', onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-6"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
          <motion.div
            role="alertdialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={spring}
            className="w-full max-w-sm border border-rule bg-paper-raised p-7 shadow-lg"
          >
            <p className="display text-xl text-ink">{title}</p>
            {body && <p className="mt-2 text-sm leading-relaxed text-ink-tertiary">{body}</p>}
            <div className="mt-7 flex gap-3">
              <Button variant="ink" onClick={onConfirm}>{confirmLabel}</Button>
              <Button variant="quiet" onClick={onCancel}>Cancel</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* --------------------------------------------------------- Editorial bits -- */

/** A standfirst: the small tracked label above a heading. */
export function Eyebrow ({ children, className }) {
  return (
    <p className={cx('label flex items-center gap-2.5 text-ink-tertiary', className)}>
      <span aria-hidden="true" className="h-px w-6 bg-pencil" />
      {children}
    </p>
  )
}

export function Sheet ({ children, className, lifted = false }) {
  return <div className={cx('sheet', lifted && 'sheet-lifted', className)}>{children}</div>
}

/* -------------------------------------------------------------- Reveal -- */

/**
 * Rises into place the first time it scrolls into view.
 *
 * Degrades to plain visible content when motion is not wanted. Content that
 * sits at opacity 0 waiting for an observer is content that can simply fail to
 * appear — under reduced-motion, in print, or if the observer never fires.
 * Hiding something until an animation rescues it is not a safe default.
 */
export function Reveal ({ children, delay = 0, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-70px' })
  const [reduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 170, damping: 26, delay } }
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

/* -------------------------------------------------------------- Counter -- */

export function Counter ({ value, className }) {
  const numeric = typeof value === 'number'
  const mv = useMotionValue(0)
  const springy = useSpring(mv, { stiffness: 80, damping: 22 })
  const rounded = useTransform(springy, (v) => Math.round(v).toLocaleString())

  useEffect(() => { if (numeric) mv.set(value) }, [value, numeric, mv])

  if (!numeric) return <span className={className}>{value}</span>
  return <motion.span className={className}>{rounded}</motion.span>
}

/* -------------------------------------------------------- Async states -- */

export function Skeleton ({ className }) {
  return <div className={cx('animate-breathe rounded-sm bg-ink/10', className)} />
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

export function Empty ({ title, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={ease}
      className="border-t border-rule py-20"
    >
      <p className="display measure text-2xl text-ink">{title}</p>
      {children && <p className="measure-tight mt-3 text-base leading-relaxed text-ink-tertiary">{children}</p>}
      {action && <div className="mt-8">{action}</div>}
    </motion.div>
  )
}

/**
 * Plain language, reason category, retry. The code is present but demoted —
 * it is for the bug report, not for the creator.
 */
export function ErrorState ({ error, onRetry, className }) {
  if (!error) return null

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring}
      className={cx('border-l-2 border-pencil bg-pencil-soft py-3 pl-4 pr-3', className)}
    >
      <p className="text-sm text-ink">{error.message}</p>
      <p className="mt-1 font-mono text-micro tracking-normal text-ink-tertiary">
        {error.code}{error.correlationId ? ` · ${error.correlationId}` : ''}
      </p>
      {onRetry && error.retryable !== false && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>Try again</Button>
      )}
    </motion.div>
  )
}

/* ----------------------------------------------------------------- Bits -- */

const TONES = {
  neutral: 'text-ink-tertiary',
  pencil: 'text-pencil',
  graphite: 'text-graphite',
  sage: 'text-sage',
  ochre: 'text-ochre'
}

export function Tag ({ tone = 'neutral', className, children }) {
  return <span className={cx('label', TONES[tone], className)}>{children}</span>
}

export function Status ({ children, tone = 'neutral', pulse = false }) {
  const dot = { neutral: 'bg-ink-faint', pencil: 'bg-pencil', graphite: 'bg-graphite', sage: 'bg-sage' }[tone]
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-tertiary">
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
    <button
      aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
      onClick={() => setTheme(toggleTheme())}
      className="grid h-8 w-8 place-items-center text-ink-tertiary transition-colors hover:text-ink"
    >
      <motion.svg
        key={theme}
        initial={{ rotate: -80, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={spring}
        viewBox="0 0 16 16" className="h-4 w-4" fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"
      >
        {dark
          ? <path d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
          : (<><circle cx="8" cy="8" r="3" /><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" /></>)}
      </motion.svg>
    </button>
  )
}

/** The wordmark. Set in the display face so the brand is the typography. */
export function Wordmark ({ className }) {
  return (
    <span className={cx('display text-lg tracking-[-0.03em] text-ink', className)}>
      Script<span className="text-pencil">.</span>
    </span>
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
