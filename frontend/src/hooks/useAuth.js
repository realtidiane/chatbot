import { useCallback, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken } from '../utils/api.js'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)

  // On mount: try to recover the session from a stored token.
  useEffect(() => {
    let cancelled = false
    // DEV PREVIEW: inject __DEMO_USER__ in localStorage to bypass auth visually.
    const demo = localStorage.getItem('__DEMO_USER__')
    if (demo) {
      try { setUser(JSON.parse(demo)) } catch { /* ignore */ }
      setLoading(false)
      return () => {}
    }
    ;(async () => {
      try {
        const cfg = await api('/api/auth/config')
        if (!cancelled) setRegistrationEnabled(!!cfg?.registration_enabled)
      } catch {
        /* keep default */
      }
      const token = getToken()
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const me = await api('/api/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        clearToken()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const { access_token } = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(access_token)
    const me = await api('/api/auth/me')
    setUser(me)
    return me
  }, [])

  const register = useCallback(async ({ email, password, name }) => {
    const { access_token } = await api('/api/auth/register', {
      method: 'POST',
      body: { email, password, name },
    })
    setToken(access_token)
    const me = await api('/api/auth/me')
    setUser(me)
    return me
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return { user, loading, registrationEnabled, login, register, logout }
}
