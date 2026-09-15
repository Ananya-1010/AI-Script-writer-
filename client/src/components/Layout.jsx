import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../state/AuthContext.jsx'
import { ThemeToggle, Wordmark } from './ui.jsx'
import { pageTransition } from '../lib/motion.js'

/**
 * A masthead, not a toolbar.
 *
 * One hairline, no fill, no shadow. The active tab is marked by a short rule
 * beneath the word — a folio mark — and that rule is a shared layout element,
 * so it slides between tabs rather than blinking off and on.
 */
export default function Layout () {
  const { user, logout } = useAuth()
  const location = useLocation()
  const composing = location.pathname.startsWith('/workspace')

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-sm">
        <div className={`mx-auto flex h-16 items-center px-6 lg:px-10 ${composing ? 'max-w-shelf' : 'max-w-6xl'}`}>
          <Link to="/dashboard" className="mr-10"><Wordmark /></Link>

          <nav className="flex items-center gap-7">
            <Tab to="/dashboard">Dashboard</Tab>
            <Tab to="/library">Library</Tab>
            <Tab to="/profile">Profile</Tab>
          </nav>

          <div className="ml-auto flex items-center gap-5">
            <ThemeToggle />
            <span className="hidden max-w-[18ch] truncate text-xs text-ink-tertiary md:inline">{user?.email}</span>
            <button onClick={logout} className="stroke-link text-sm text-ink-secondary">Sign out</button>
          </div>
        </div>
      </header>

      {/*
        Keyed on the SECTION, not the full pathname. Moving between Dashboard,
        Library and Workspace should animate; moving *within* the workspace —
        /workspace/new to /workspace/:id after the brief is submitted — must
        not, because remounting there destroys the component awaiting the
        generation.
      */}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname.split('/')[1] || 'home'}
          {...pageTransition}
          className={composing ? 'px-6 py-10 lg:px-10' : 'mx-auto max-w-6xl px-6 py-14 lg:px-10'}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

function Tab ({ to, children }) {
  return (
    <NavLink to={to} className="relative py-1 text-sm outline-none">
      {({ isActive }) => (
        <>
          <span className={`transition-colors duration-DEFAULT ${isActive ? 'text-ink' : 'text-ink-tertiary hover:text-ink-secondary'}`}>
            {children}
          </span>
          {isActive && (
            <motion.span
              layoutId="folio-rule"
              aria-hidden="true"
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="absolute -bottom-[21px] left-0 h-[2px] w-full bg-pencil"
            />
          )}
        </>
      )}
    </NavLink>
  )
}
