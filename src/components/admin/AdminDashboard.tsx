import { useMemo, useState } from 'react'
import { Diamond, LogOut, ShieldCheck } from 'lucide-react'
import { cx } from '../../lib/cx'
import type { AdminUser } from '../../lib/adminApi'
import { AdminButton } from './AdminUi'
import { ArticlesPanel } from './panels/ArticlesPanel'
import { LogsPanel } from './panels/LogsPanel'
import { MembersPanel } from './panels/MembersPanel'
import { OverviewPanel } from './panels/OverviewPanel'
import { PhotosPanel } from './panels/PhotosPanel'
import { VideosPanel } from './panels/VideosPanel'

type PanelKey = 'overview' | 'articles' | 'logs' | 'photos' | 'videos' | 'members'

const PANELS: Array<{
  key: PanelKey
  label: string
  labelEn: string
  permission?: string
}> = [
  { key: 'overview', label: '概览', labelEn: 'OVERVIEW' },
  { key: 'articles', label: '文章', labelEn: 'ARTICLES', permission: 'articles' },
  { key: 'logs', label: '日志', labelEn: 'LOGS', permission: 'logs' },
  { key: 'photos', label: '照片', labelEn: 'PHOTOS', permission: 'photos' },
  { key: 'videos', label: '视频', labelEn: 'VIDEOS', permission: 'videos' },
  { key: 'members', label: '成员', labelEn: 'MEMBERS', permission: 'members' },
]

interface AdminDashboardProps {
  user: AdminUser
  onLogout: () => void
}

/** 管理控制台：按账号权限显示可管理的模块 */
export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [panel, setPanel] = useState<PanelKey>('overview')

  const allowed = useMemo(
    () =>
      PANELS.filter(
        (item) =>
          !item.permission ||
          user.role === 'owner' ||
          user.permissions.includes(item.permission),
      ),
    [user],
  )
  const current = allowed.some((item) => item.key === panel) ? panel : 'overview'

  return (
    <div className="min-h-screen bg-rhine-abyss text-rhine-ink">
      <header className="sticky top-0 z-20 border-b border-rhine-line/70 bg-rhine-abyss/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-rhine-gold/60 bg-rhine-gold/5">
              <Diamond className="h-4 w-4 text-rhine-gold" />
            </span>
            <div>
              <p className="font-display text-xs tracking-[0.22em] text-rhine-ink">
                RHINE//ADMIN
              </p>
              <p className="mt-0.5 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                CONTENT CONSOLE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-wider text-rhine-dim">
            <ShieldCheck className="h-3.5 w-3.5 text-rhine-cyan" />
            <span>
              {user.username} · {user.role === 'owner' ? 'OWNER' : 'ADMIN'}
            </span>
            <AdminButton variant="ghost" onClick={onLogout}>
              <LogOut className="h-3 w-3" /> 退出
            </AdminButton>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col">
            {allowed.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPanel(item.key)}
                className={cx(
                  'flex shrink-0 items-center justify-between gap-3 border px-3 py-2 text-left transition-colors',
                  current === item.key
                    ? 'border-rhine-gold/60 bg-rhine-gold/10 text-rhine-gold'
                    : 'border-transparent text-rhine-dim hover:border-rhine-line hover:text-rhine-ink',
                )}
              >
                <span className="text-xs">{item.label}</span>
                <span className="font-mono text-[9px] tracking-[0.2em] opacity-70">
                  {item.labelEn}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {current === 'overview' && <OverviewPanel user={user} />}
          {current === 'articles' && <ArticlesPanel />}
          {current === 'logs' && <LogsPanel />}
          {current === 'photos' && <PhotosPanel />}
          {current === 'videos' && <VideosPanel />}
          {current === 'members' && <MembersPanel currentUser={user} />}
        </main>
      </div>
    </div>
  )
}
