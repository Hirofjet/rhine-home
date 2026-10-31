import { useEffect, useState } from 'react'
import {
  adminApi,
  clearToken,
  getToken,
  setToken,
  type AdminUser,
} from '../lib/adminApi'
import { AdminLogin } from '../components/admin/AdminLogin'
import { AdminDashboard } from '../components/admin/AdminDashboard'

/**
 * 管理后台页面（独立于前台布局，不出现在导航中）。
 * 入口路径由 VITE_ADMIN_PATH 控制，默认 /admin。
 */
export function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(() => Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) return undefined
    let alive = true
    adminApi
      .me()
      .then((data) => {
        if (alive) setUser(data.user)
      })
      .catch(() => {
        clearToken()
        if (alive) setUser(null)
      })
      .finally(() => {
        if (alive) setChecking(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rhine-abyss">
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.35em] text-rhine-faint">
          AUTHENTICATING …
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <AdminLogin
        onLogin={(next, token) => {
          setToken(token)
          setUser(next)
        }}
      />
    )
  }

  return (
    <AdminDashboard
      user={user}
      onLogout={() => {
        void adminApi.logout().catch(() => undefined)
        clearToken()
        setUser(null)
      }}
    />
  )
}
