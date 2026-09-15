import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, ThemeToggle, Aura } from './ui.jsx'
import { pageTransition, spring } from '../lib/motion.js'

/**
 * A floating glass bar over the living field, not a bordered strip.
 *
 * The active tab is a shared layout element: `layoutId` makes the pill travel
 * between tabs instead of disappearing and reappearing, so navigation reads as
 * one object moving rather than two states swapping.
 */
export default function Layout () {
  const { user, logout } = useAuth()
  const location = useLocation()
  const composing = location.pathname.startsWith('/workspace')

  return (
    <div className="relative min-h-screen">
      <Aura />

      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4">
        <motion.div
          initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}
          className={`glass mx-auto flex h-14 items-center gap-1 rounded-2xl px-3 py-2 ${composing ? 'max-w-[74rem]' : 'max-w-5xl'}`}
        >
          <Link to="/" className="group mr-4 flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-accent to-creator text-[10px] font-medium text-white shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.35),0_3px_10px_-2px_hsl(var(--accent-glow))] transition-transform group-hover:scale-110"
            >
              A
            </span>
            <span className="hidden text-sm font-medium text-content sm:inline">Script Writer</span>
          </Link>

          <nav className="flex items-center gap-0.5">
            <Tab to="/" end>Dashboard</Tab>
            <Tab to="/library">Library</Tab>
            <Tab to="/profile">Profile</Tab>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <span className="hidden max-w-[16ch] truncate px-2 text-xs text-content-tertiary md:inline">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={logout}>Sign out</Button>
          </div>
        </motion.div>
      </header>

      {/*
        Keyed on the SECTION, not the full pathname.
        Moving between Dashboard / Library / Workspace should animate. Moving
        *within* the workspace — /workspace/new to /workspace/:id after the
        brief is submitted — must not, because remounting there destroys the
        component that is awaiting the generation and the draft lands on an
        instance that no longer exists.
      */}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname.split('/')[1] || 'home'}
          {...pageTransition}
          className={composing ? 'px-4 py-8 sm:px-6' : 'mx-auto max-w-5xl px-4 py-10 sm:px-6'}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

function Tab ({ to, end, children }) {
  return (
    <NavLink to={to} end={end} className="relative rounded-xl px-3 py-1.5 text-sm outline-none">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="tab-pill"
              aria-hidden="true"
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="absolute inset-0 rounded-xl bg-[hsl(var(--text)/0.07)] shadow-[inset_0_1px_0_0_hsl(var(--glass-highlight))]"
            />
          )}
          <span className={`relative transition-colors ${isActive ? 'text-content' : 'text-content-tertiary hover:text-content-secondary'}`}>
            {children}
          </span>
        </>
      )}
    </NavLink>
  )
}
