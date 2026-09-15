import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
import { Login, Register } from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Workspace from './pages/Workspace.jsx'
import Library from './pages/Library.jsx'
import Profile from './pages/Profile.jsx'
import { Loading } from './components/ui.jsx'

function Protected ({ children }) {
  const { status } = useAuth()
  // 'checking' is rendered, not skipped: without it every refresh flashes the
  // signed-out page before the stored token has been verified.
  if (status === 'checking') return <Screen><Loading label="Checking your session" /></Screen>
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return children
}

function Anonymous ({ children }) {
  const { status } = useAuth()
  if (status === 'checking') return <Screen><Loading /></Screen>
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return children
}

const Screen = ({ children }) => (
  <div className="mx-auto max-w-md px-6 py-24">{children}</div>
)

export default function App () {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* The public site. Signed-in visitors go straight to work. */}
          <Route path="/" element={<Anonymous><Landing /></Anonymous>} />
          <Route path="/login" element={<Anonymous><Login /></Anonymous>} />
          <Route path="/register" element={<Anonymous><Register /></Anonymous>} />

          <Route element={<Protected><Layout /></Protected>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="profile" element={<Profile />} />
            <Route path="workspace/:id" element={<Workspace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
