import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import { Login, Register } from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Workspace from './pages/Workspace.jsx'
import Library from './pages/Library.jsx'
import Profile from './pages/Profile.jsx'
import { Loading } from './components/ui.jsx'

function Protected ({ children }) {
  const { status } = useAuth()

  // 'checking' is rendered, not skipped: without it every refresh flashes the
  // login screen before the stored token has been verified.
  if (status === 'checking') return <Loading label="Checking your session…" />
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return children
}

function Anonymous ({ children }) {
  const { status } = useAuth()
  if (status === 'checking') return <Loading />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return children
}

export default function App () {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Anonymous><Login /></Anonymous>} />
          <Route path="/register" element={<Anonymous><Register /></Anonymous>} />

          <Route element={<Protected><Layout /></Protected>}>
            <Route index element={<Dashboard />} />
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
