/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from './api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'smartclean-access-token'
const USER_KEY = 'smartclean-api-user'

function readSession() {
  try {
    localStorage.removeItem('smartclean-demo-accounts')
    sessionStorage.removeItem('smartclean-demo-user-v2')
    return {
      token: sessionStorage.getItem(TOKEN_KEY),
      user: JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'),
    }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  useEffect(() => {
    if (!session.token) return undefined
    let active = true
    apiRequest('/auth/me', { token: session.token }).then((account) => {
      if (!active) return
      const user = {
        id: account.id,
        name: account.display_name,
        email: account.email,
        role: account.role,
        accountStatus: account.account_status,
        createdAt: account.created_at,
        lastLoginAt: account.last_login_at,
      }
      try { sessionStorage.setItem(USER_KEY, JSON.stringify(user)) } catch { /* Session remains available in memory. */ }
      setSession((current) => current.token === session.token ? { ...current, user } : current)
    }).catch(() => {
      if (!active) return
      try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY) } catch { /* Best effort cleanup. */ }
      setSession((current) => current.token === session.token ? { token: null, user: null } : current)
    })
    return () => { active = false }
  }, [session.token])

  function establishSession(result) {
    const user = {
      id: result.user.id,
      name: result.user.display_name,
      email: result.user.email,
      role: result.user.role,
      accountStatus: result.user.account_status,
      createdAt: result.user.created_at,
      lastLoginAt: result.user.last_login_at,
    }
    try {
      sessionStorage.setItem(TOKEN_KEY, result.access_token)
      sessionStorage.setItem(USER_KEY, JSON.stringify(user))
      sessionStorage.removeItem('smartclean-demo-user-v2')
      sessionStorage.removeItem('smartclean-demo-accounts')
      localStorage.removeItem('smartclean-demo-accounts')
    } catch {
      // Keep the current page session if browser storage is unavailable.
    }
    setSession({ token: result.access_token, user })
    return user
  }

  async function signIn({ email, password }) {
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      return { user: establishSession(result) }
    } catch (error) {
      return { error: error.message }
    }
  }

  async function signUp({ name, email, password }) {
    try {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ display_name: name, email, password }),
      })
      return { user: establishSession(result) }
    } catch (error) {
      return { error: error.message }
    }
  }

  async function requestPasswordReset() {
    return { message: 'Password recovery is not available yet. Please contact the SmartClean administrator.' }
  }

  function signOut() {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(USER_KEY)
    } catch {
      // Clearing browser storage is best effort.
    }
    setSession({ token: null, user: null })
  }

  return (
    <AuthContext.Provider value={{ user: session.user, token: session.token, signIn, signUp, requestPasswordReset, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
