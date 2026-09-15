import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { Button, ThemeToggle } from './ui.jsx'

/**
 * The shell is chrome, so it behaves like chrome: one hairline, no fill, no
 * shadow, and type one step smaller than the content beneath it. On the
 * workspace it goes further and gets out of the way entirely, because that
 * screen belongs to the script.
 */
export default function Layout () {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const composing = pathname.startsWith('/workspace')

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className={composing ? 'px-4 sm:px-6' : 'mx-auto max-w-5xl px-4 sm:px-6'}>
          <div className="flex h-12 items-center gap-1">
            <Link
              to="/"
              className="mr-4 flex items-center gap-2 text-sm font-medium text-content transition hover:text-accent-text"
            >
              <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-sm bg-accent text-[10px] text-white">
                A
              </span>
              Script Writer
            </Link>

            <nav className="flex items-center gap-0.5">
              <Tab to="/" end>Dashboard</Tab>
              <Tab to="/library">Library</Tab>
              <Tab to="/profile">Profile</Tab>
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <span className="hidden max-w-[16ch] truncate px-2 text-xs text-content-tertiary sm:inline">
                {user?.email}
              </span>
              <Button size="sm" variant="ghost" onClick={logout}>Sign out</Button>
            </div>
          </div>
        </div>
      </header>

      <main className={composing ? 'px-4 py-6 sm:px-6' : 'mx-auto max-w-5xl px-4 py-8 sm:px-6'}>
        <Outlet />
      </main>
    </div>
  )
}

function Tab ({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'relative rounded px-2.5 py-1 text-sm transition ease-out',
          isActive
            ? 'text-content'
            : 'text-content-tertiary hover:text-content-secondary hover:bg-surface-sunken'
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {/* A hairline under the active tab, inset to the text. Reads as
              precision; a filled pill reads as a toolbar. */}
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute inset-x-2.5 -bottom-[13px] h-px bg-content"
            />
          )}
        </>
      )}
    </NavLink>
  )
}
