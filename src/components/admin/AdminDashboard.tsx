import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, LogOut, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { hasPerm, ROLE_LABELS, type ApiUser } from '../../lib/api'
import { useSiteBrand } from '../../hooks/useSiteBrand'
import { ThemeMenu } from '../theme/ThemeMenu'
import { AdminBadge, AdminButton } from './AdminUi'
import { ArticlesPanel } from './panels/ArticlesPanel'
import { ForumAnnouncementsPanel } from './panels/ForumAnnouncementsPanel'
import { ForumClassPanel } from './panels/ForumClassPanel'
import { CreateForumPanel } from './panels/CreateForumPanel'
import { IdentityPanel } from './panels/IdentityPanel'
import { GuestbookPanel } from './panels/GuestbookPanel'
import { LogsPanel } from './panels/LogsPanel'
import { MembersPanel } from './panels/MembersPanel'
import { OverviewPanel } from './panels/OverviewPanel'
import { PhotosPanel } from './panels/PhotosPanel'
import { ProfilePanel } from './panels/ProfilePanel'
import { ProjectsPanel } from './panels/ProjectsPanel'
import { ReviewPanel } from './panels/ReviewPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { VideosPanel } from './panels/VideosPanel'

type PanelKey =
  | 'overview'
  | 'home-profile'
  | 'projects'
  | 'articles'
  | 'photos'
  | 'videos'
  | 'logs'
  | 'guestbook'
  | 'forum-announcements'
  | 'forum-create'
  | 'forum-public'
  | 'forum-special'
  | 'forum-core'
  | 'review'
  | 'members'
  | 'identities'
  | 'settings'

interface MenuItem {
  key: PanelKey
  label: string
  labelEn: string
  subgroup?: string
}

interface AdminDashboardProps {
  user: ApiUser
  onLogout: () => void
}

/** 管理控制台：按权限显示可管理模块 */
export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [panel, setPanel] = useState<PanelKey>('overview')
  const brand = useSiteBrand()

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

    if (user.isSuper) {
      list.push({
        title: '主页',
        items: [{ key: 'home-profile', label: '主页资料', labelEn: 'PROFILE' }],
      })
    }

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

    if (user.isSuper || hasPerm(user, 'projects')) {
      list.push({
        title: '项目',
        items: [{ key: 'projects', label: '项目库', labelEn: 'PROJECTS' }],
      })
    }

    if (hasPerm(user, 'logs')) {
      list.push({
        title: '日志',
        items: [{ key: 'logs', label: '日志', labelEn: 'LOGS' }],
      })
    }

    const forum: MenuItem[] = []
    if (forumAccess) {
      forum.push(
        { key: 'forum-announcements', label: '主页公告', labelEn: 'ANNOUNCEMENTS', subgroup: '论坛管理' },
        { key: 'forum-create', label: '创建论坛', labelEn: 'CREATE', subgroup: '论坛管理' },
        { key: 'forum-public', label: '普通论坛', labelEn: 'PUBLIC', subgroup: '论坛管理' },
        { key: 'forum-special', label: '特殊论坛', labelEn: 'SPECIAL', subgroup: '论坛管理' },
        { key: 'forum-core', label: '核心论坛', labelEn: 'CORE', subgroup: '论坛管理' },
        { key: 'review', label: '审核平台', labelEn: 'REVIEW', subgroup: '审核平台' },
      )
    }
    if (forum.length) list.push({ title: '论坛', items: forum })

    if (hasPerm(user, 'guestbook')) {
      list.push({
        title: '互动',
        items: [{ key: 'guestbook', label: '留言板', labelEn: 'GUESTBOOK' }],
      })
    }

    if (memberAccess) {
      list.push({
        title: '成员',
        items: [
          { key: 'members', label: '成员与权限', labelEn: 'MEMBERS' },
          { key: 'identities', label: '身份管理', labelEn: 'IDENTITIES' },
        ],
      })
    }

    list.push({
      title: '设置',
      items: [{ key: 'settings', label: '设置', labelEn: 'SETTINGS' }],
    })
    return list
  }, [user, forumAccess, memberAccess])

  const allowedKeys = groups.flatMap((group) => group.items.map((item) => item.key))
  const current = allowedKeys.includes(panel) ? panel : 'overview'

  return (
    <div className="min-h-screen bg-rhine-abyss text-rhine-ink">
      <header className="sticky top-0 z-20 border-b border-rhine-line/70 bg-rhine-abyss/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex shrink-0 items-center gap-3" title="返回前台主页">
            <span className="flex h-9 w-9 items-center justify-center border border-rhine-gold/60 bg-rhine-gold/5 transition-all duration-300 group-hover:border-rhine-gold group-hover:bg-rhine-gold/10 group-hover:shadow-[0_0_18px_rgb(211_178_122/0.25)]">
              <Home className="h-4 w-4 text-rhine-gold" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="whitespace-nowrap font-display text-sm font-medium tracking-[0.18em] text-rhine-ink">
                {brand}
              </span>
              <span className="mt-1 whitespace-nowrap font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                CONTENT CONSOLE
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 flex-wrap items-center gap-3 font-mono text-[10px] tracking-wider text-rhine-dim">
            <ThemeMenu compact />
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
          <div className="border border-rhine-line/60 bg-rhine-panel/30 p-2 lg:sticky lg:top-20">
            <nav className="flex gap-4 overflow-x-auto pb-1 lg:flex-col lg:gap-5">
              {groups.map((group) => (
                <div key={group.title} className="shrink-0">
                  <p className="mb-1.5 font-mono text-[8px] tracking-[0.3em] text-rhine-faint">
                    {group.title}
                  </p>
                  <div className="flex gap-1 lg:flex-col">
                    {group.items.map((item, index) => (
                      <div key={item.key} className="contents lg:block">
                        {item.subgroup &&
                          (index === 0 || group.items[index - 1]?.subgroup !== item.subgroup) && (
                            <p className="mt-2 mb-1 px-3 font-mono text-[8px] tracking-[0.25em] text-rhine-gold/70">
                              {item.subgroup}
                            </p>
                          )}
                        <button
                        type="button"
                        onClick={() => setPanel(item.key)}
                        className={cx(
                          'flex w-full shrink-0 items-center justify-between gap-3 border-l-2 px-3 py-2 text-left transition-colors',
                          current === item.key
                            ? 'border-l-rhine-gold bg-rhine-gold/10 text-rhine-gold'
                            : 'border-l-transparent text-rhine-dim hover:border-l-rhine-line hover:bg-rhine-abyss/40 hover:text-rhine-ink',
                        )}
                      >
                        <span className="text-xs">{item.label}</span>
                        <span className="font-mono text-[8px] tracking-[0.2em] opacity-60">
                          {item.labelEn}
                        </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {current === 'overview' && (
                <OverviewPanel user={user} onNavigate={(key) => setPanel(key as PanelKey)} />
              )}
              {current === 'home-profile' && <ProfilePanel />}
              {current === 'projects' && <ProjectsPanel />}
              {current === 'articles' && <ArticlesPanel />}
              {current === 'photos' && <PhotosPanel />}
              {current === 'videos' && <VideosPanel />}
              {current === 'logs' && <LogsPanel />}
              {current === 'guestbook' && <GuestbookPanel />}
              {current === 'forum-announcements' && <ForumAnnouncementsPanel />}
              {current === 'forum-create' && <CreateForumPanel />}
              {current === 'forum-public' && <ForumClassPanel access="public" />}
              {current === 'forum-special' && <ForumClassPanel access="special" />}
              {current === 'forum-core' && <ForumClassPanel access="core" />}
              {current === 'review' && <ReviewPanel />}
              {current === 'members' && <MembersPanel user={user} />}
              {current === 'identities' && <IdentityPanel actor={user} />}
              {current === 'settings' && <SettingsPanel user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
