import { useMemo, useState } from 'react'
import { Diamond, LogOut, ShieldCheck } from 'lucide-react'
import { cx } from '../../lib/cx'
import { hasPerm, ROLE_LABELS, type ApiUser } from '../../lib/api'
import { AdminBadge, AdminButton } from './AdminUi'
import { ArticlesPanel } from './panels/ArticlesPanel'
import { ForumBoardsPanel } from './panels/ForumBoardsPanel'
import { LogsPanel } from './panels/LogsPanel'
import { MembersPanel } from './panels/MembersPanel'
import { OverviewPanel } from './panels/OverviewPanel'
import { PhotosPanel } from './panels/PhotosPanel'
import { ReviewPanel } from './panels/ReviewPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { VideosPanel } from './panels/VideosPanel'

type PanelKey =
  | 'overview'
  | 'articles'
  | 'photos'
  | 'videos'
  | 'logs'
  | 'forum-boards'
  | 'review'
  | 'members'
  | 'settings'

interface MenuItem {
  key: PanelKey
  label: string
  labelEn: string
}

interface AdminDashboardProps {
  user: ApiUser
  onLogout: () => void
}

/** 管理控制台：按权限显示可管理模块 */
export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [panel, setPanel] = useState<PanelKey>('overview')

  const forumAccess =
    user.isSuper ||
    user.permissions.some((p) => p === 'forum' || p.startsWith('forum.'))
  const memberAccess =
    user.isSuper ||
    user.permissions.includes('members.manage') ||
    user.permissions.includes('members.grant')

  const groups = useMemo(() => {
    const list: Array<{ title: string; items: MenuItem[] }> = [
      { title: '总览', items: [{ key: 'overview', label: '概览', labelEn: 'OVERVIEW' }] },
    ]

    const archive: MenuItem[] = []
    if (hasPerm(user, 'archive.articles')) {
      archive.push({ key: 'articles', label: '文章', labelEn: 'ARTICLES' })
    }
    if (hasPerm(user, 'archive.photos')) {
      archive.push({ key: 'photos', label: '照片', labelEn: 'PHOTOS' })
    }
    if (hasPerm(user, 'archive.videos')) {
      archive.push({ key: 'videos', label: '视频', labelEn: 'VIDEOS' })
    }
    if (archive.length) list.push({ title: '档案', items: archive })

    if (hasPerm(user, 'logs')) {
      list.push({
        title: '日志',
        items: [{ key: 'logs', label: '日志', labelEn: 'LOGS' }],
      })
    }

    const forum: MenuItem[] = []
    if (forumAccess) {
      forum.push({ key: 'forum-boards', label: '板块管理', labelEn: 'BOARDS' })
      forum.push({ key: 'review', label: '内容审核', labelEn: 'REVIEW' })
    }
    if (forum.length) list.push({ title: '论坛', items: forum })

    if (memberAccess) {
      list.push({
        title: '成员',
        items: [{ key: 'members', label: '成员与权限', labelEn: 'MEMBERS' }],
      })
    }

    list.push({
      title: '账号',
      items: [{ key: 'settings', label: '设置', labelEn: 'SETTINGS' }],
    })
    return list
  }, [user, forumAccess, memberAccess])

  const allowedKeys = groups.flatMap((group) => group.items.map((item) => item.key))
  const current = allowedKeys.includes(panel) ? panel : 'overview'

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
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-wider text-rhine-dim">
            <ShieldCheck className="h-3.5 w-3.5 text-rhine-cyan" />
            <span>{user.username}</span>
            <AdminBadge tone={user.isSuper ? 'gold' : 'cyan'}>
              {ROLE_LABELS[user.role]}
            </AdminBadge>
            <AdminButton variant="ghost" onClick={onLogout}>
              <LogOut className="h-3 w-3" /> 退出
            </AdminButton>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-4 overflow-x-auto pb-1 lg:flex-col lg:gap-5">
            {groups.map((group) => (
              <div key={group.title} className="shrink-0">
                <p className="mb-1.5 font-mono text-[8px] tracking-[0.3em] text-rhine-faint">
                  {group.title}
                </p>
                <div className="flex gap-1 lg:flex-col">
                  {group.items.map((item) => (
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
                      <span className="font-mono text-[8px] tracking-[0.2em] opacity-60">
                        {item.labelEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {current === 'overview' && (
            <OverviewPanel user={user} onNavigate={(key) => setPanel(key as PanelKey)} />
          )}
          {current === 'articles' && <ArticlesPanel />}
          {current === 'photos' && <PhotosPanel />}
          {current === 'videos' && <VideosPanel />}
          {current === 'logs' && <LogsPanel />}
          {current === 'forum-boards' && <ForumBoardsPanel user={user} />}
          {current === 'review' && <ReviewPanel />}
          {current === 'members' && <MembersPanel user={user} />}
          {current === 'settings' && <SettingsPanel user={user} />}
        </main>
      </div>
    </div>
  )
}
