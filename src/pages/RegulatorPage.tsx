import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useSession } from '../components/auth/useSession'
import { SecurityLogsPanel } from '../components/admin/panels/SecurityLogsPanel'
import { ReportsPanel } from '../components/admin/panels/ReportsPanel'
import { NotFoundPage } from './NotFoundPage'

/** 监管只读视图：不提供后台写操作，只展示请求/审计日志与举报工单。 */
export function RegulatorPage() {
  const { user, loading } = useSession()
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-rhine-abyss">
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          AUTHENTICATING
        </p>
      </main>
    )
  }
  const allowed =
    user?.isSuper ||
    user?.identity === 'regulator' ||
    Boolean(user?.permissions.includes('security.readonly'))
  if (!user || !allowed) return <NotFoundPage />

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-20 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-gold">
            REGULATOR // READ ONLY
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-rhine-ink">
            <ShieldCheck className="h-5 w-5 text-rhine-gold" /> 监管只读视图
          </h1>
          <p className="mt-1 font-mono text-[10px] text-rhine-dim">
            当前账号仅可读取日志与举报工单；所有访问写入请求/审计日志。
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 border border-rhine-line px-3 py-2 font-mono text-[9px] text-rhine-dim hover:text-rhine-gold"
        >
          <ArrowLeft className="h-3 w-3" /> 返回主页
        </Link>
      </header>
      <div className="mt-6 space-y-8">
        <ReportsPanel />
        <SecurityLogsPanel />
      </div>
    </main>
  )
}
