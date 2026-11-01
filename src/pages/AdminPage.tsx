import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../components/auth/useSession'
import { AdminLogin } from '../components/admin/AdminLogin'
import { AdminDashboard } from '../components/admin/AdminDashboard'
import { ROLE_LABELS } from '../lib/api'

/**
 * 管理后台页面（独立于前台布局，不出现在导航中）。
 * 入口路径由 VITE_ADMIN_PATH 控制，默认 /admin。
 */
export function AdminPage() {
  const { user, loading, staff, logout } = useSession()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rhine-abyss">
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.35em] text-rhine-faint">
          AUTHENTICATING …
        </p>
      </div>
    )
  }

  if (!user) return <AdminLogin />

  if (!staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rhine-abyss px-4">
        <div className="w-full max-w-sm border border-rhine-red/30 bg-rhine-panel/40 p-6 text-center">
          <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
            ACCESS DENIED
          </p>
          <p className="mt-3 font-mono text-xs tracking-wider text-rhine-red">
            该账号没有后台管理权限
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-wider text-rhine-dim">
            当前账号：{user.username}（{ROLE_LABELS[user.role]}）
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void logout()}
              className="border border-rhine-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-rhine-dim transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold"
            >
              退出登录
            </button>
            <Link
              to="/"
              className="border border-rhine-gold/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-rhine-gold"
            >
              返回主页
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminDashboard
      user={user}
      onLogout={() => {
        void logout().then(() => navigate('/'))
      }}
    />
  )
}
