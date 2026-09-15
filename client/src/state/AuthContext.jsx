import { createContext, useContext, useEffect, useState } from 'react'
import { tokenStore } from '../api/client.js'
import { auth } from '../api/endpoints.js'

const AuthContext = createContext(null)

export function AuthProvider ({ children }) {
  const [user, setUser] = useState(null)
  // 'checking' is a real state, not a detail. Without it the app flashes the
  // login screen on every refresh before the token is verified.
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    if (!tokenStore.get()) {
      setStatus('anonymous')
      return
    }
    auth.me()
      .then((me) => { setUser(me); setStatus('authenticated') })
      .catch(() => { tokenStore.clear(); setStatus('anonymous') })
  }, [])

  const adopt = async (token) => {
    tokenStore.set(token)
    const me = await auth.me()
    setUser(me)
    setStatus('authenticated')
    return me
  }

  const value = {
    user,
    status,
    isAuthenticated: status === 'authenticated',

    async login (credentials) {
      const { accessToken } = await auth.login(credentials)
      return adopt(accessToken)
    },

    async register (details) {
      const { accessToken } = await auth.register(details)
      return adopt(accessToken)
    },

    logout () {
      tokenStore.clear()
      setUser(null)
      setStatus('anonymous')
    },

    // Called after the profile is saved, so the dashboard's "set up your
    // profile" prompt disappears without a page reload.
    markProfileComplete () {
      setUser((current) => (current ? { ...current, hasProfile: true } : current))
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth () {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
