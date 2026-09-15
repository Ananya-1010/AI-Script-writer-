import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
  }`

export default function Layout () {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="mr-4 font-semibold text-app">AI Script Writer</Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/library" className={linkClass}>Library</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
            <button onClick={logout} className="text-sm text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
