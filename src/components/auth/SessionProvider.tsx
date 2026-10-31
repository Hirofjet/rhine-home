import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { ApiUser } from '../../lib/api'
import {
  authApi,
  clearToken,
  getToken,
  isStaffUser,
  setToken,
} from '../../lib/api'
import { SessionContext, type SessionValue } from './session'

/** 全站登录状态（论坛与后台共用同一令牌） */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(() => Boolean(getToken()))

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const data = await authApi.me()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    if (getToken()) {
      authApi
        .me()
        .then((data) => {
          if (alive) setUser(data.user)
        })
        .catch(() => {
          if (alive) setUser(null)
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }

    const onSession = () => {
      if (!getToken()) {
        setUser(null)
        setLoading(false)
        return
      }
      authApi
        .me()
        .then((data) => setUser(data.user))
        .catch(() => setUser(null))
    }
    window.addEventListener('rhine:session', onSession)
    return () => {
      alive = false
      window.removeEventListener('rhine:session', onSession)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* 令牌可能已失效 */
    }
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      staff: isStaffUser(user),
      login,
      logout,
      refresh,
    }),
    [user, loading, login, logout, refresh],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
