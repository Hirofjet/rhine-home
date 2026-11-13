import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cx } from '../../lib/cx'
import type { ApiUser } from '../../lib/api'
import { canAccessPanel, type AdminPanelKey } from '../../lib/adminPermissions'
import { ArticlesPanel } from './panels/ArticlesPanel'
import { ForumAnnouncementsPanel } from './panels/ForumAnnouncementsPanel'
import { ForumMaintenancePanel } from './panels/ForumMaintenancePanel'
import { ForumMembersPanel } from './panels/ForumMembersPanel'
import { GuestbookPanel } from './panels/GuestbookPanel'
import { LogsPanel } from './panels/LogsPanel'
import { MembersPanel } from './panels/MembersPanel'
import { ModerationPanel } from './panels/ModerationPanel'
import { OverviewPanel } from './panels/OverviewPanel'
import { PhotosPanel } from './panels/PhotosPanel'
import { ProfilePanel } from './panels/ProfilePanel'
import { ProjectsPanel } from './panels/ProjectsPanel'
import { ReportsPanel } from './panels/ReportsPanel'
import { ReviewPanel } from './panels/ReviewPanel'
import { ReviewAccessPanel } from './panels/ReviewAccessPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { ReviewLogsPanel } from './panels/ReviewLogsPanel'
import { SecurityLogsPanel } from './panels/SecurityLogsPanel'
import { ThemesPanel } from './panels/ThemesPanel'
import { VideosPanel } from './panels/VideosPanel'

type PanelKey = AdminPanelKey

interface MenuItem {
  key: PanelKey
  label: string
  labelEn: string
  subgroup?: string
}

interface AdminDashboardProps {
  user: ApiUser
}

/** 管理控制台：按权限显示可管理模块 */
export function AdminDashboard({ user }: AdminDashboardProps) {
  const [panel, setPanel] = useState<PanelKey>('overview')

  const groups = useMemo(() => {
    const item = (key: AdminPanelKey, label: string, labelEn: string, subgroup?: string): MenuItem => ({
      key,
      label,
      labelEn,
      subgroup,
    })
    const list: Array<{ title: string; items: MenuItem[] }> = []
    const push = (title: string, items: MenuItem[]) => {
      if (items.length) list.push({ title, items })
    }

    if (canAccessPanel(user, 'overview')) {
      push('总览', [item('overview', '概览', 'OVERVIEW')])
    }
    if (canAccessPanel(user, 'home-profile')) {
      push('主页', [item('home-profile', '主页资料', 'PROFILE')])
    }
    push(
      '档案',
      [
        canAccessPanel(user, 'articles') ? item('articles', '文章', 'ARTICLES') : null,
        canAccessPanel(user, 'photos') ? item('photos', '照片', 'PHOTOS') : null,
        canAccessPanel(user, 'videos') ? item('videos', '视频', 'VIDEOS') : null,
      ].filter(Boolean) as MenuItem[],
    )
    push('项目', canAccessPanel(user, 'projects') ? [item('projects', '项目库', 'PROJECTS')] : [])
    push('日志', canAccessPanel(user, 'logs') ? [item('logs', '日志', 'LOGS')] : [])

    push('论坛', [
      canAccessPanel(user, 'forum-maintenance')
        ? item('forum-maintenance', '论坛创建与维护', 'MAINTAIN', '论坛管理')
        : null,
      canAccessPanel(user, 'forum-members')
        ? item('forum-members', '论坛成员管理', 'MEMBERS', '论坛管理')
        : null,
      canAccessPanel(user, 'forum-announcements')
        ? item('forum-announcements', '论坛公告', 'ANNOUNCEMENTS', '论坛管理')
        : null,
      canAccessPanel(user, 'review-access')
        ? item('review-access', '特殊/核心申请', 'APPLICATIONS', '审核平台')
        : null,
      canAccessPanel(user, 'review-posts')
        ? item('review-posts', '待审帖子', 'PENDING', '审核平台')
        : null,
      canAccessPanel(user, 'review-logs')
        ? item('review-logs', '审核日志', 'AUDIT LOGS', '审核平台')
        : null,
    ].filter(Boolean) as MenuItem[])

    push('互动', canAccessPanel(user, 'guestbook') ? [item('guestbook', '留言板', 'GUESTBOOK')] : [])
    if (user.isSuper) {
      push('成员', [item('members', '成员与权限', 'MEMBERS & PERMISSIONS')])
    }
    push(
      '安全',
      [
        canAccessPanel(user, 'reports') ? item('reports', '举报处理', 'REPORTS') : null,
        canAccessPanel(user, 'moderation') ? item('moderation', '内容安全', 'MODERATION') : null,
      ].filter(Boolean) as MenuItem[],
    )

    const settingsItems: MenuItem[] = []
    if (canAccessPanel(user, 'security-logs')) {
      settingsItems.push(item('security-logs', '安全日志', 'SECURITY LOGS'))
    }
    if (canAccessPanel(user, 'themes')) {
      settingsItems.push(item('themes', '主题颜色', 'THEMES'))
    }
    settingsItems.push(item('settings', '设置', 'SETTINGS'))
    push('设置', settingsItems)
    return list
  }, [user])

  const allowedKeys = groups.flatMap((group) => group.items.map((item) => item.key))
  const current = allowedKeys.includes(panel) ? panel : (allowedKeys[0] ?? 'settings')

  return (
    <div className="min-h-screen bg-rhine-abyss text-rhine-ink">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.035]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 3px, currentColor 3px 4px)',
          mixBlendMode: 'overlay',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:hidden">
        <label className="block">
          <span className="mb-1 block font-mono text-[8px] tracking-[0.25em] text-rhine-faint">
            当前栏目
          </span>
          <select
            value={current}
            onChange={(event) => setPanel(event.target.value as PanelKey)}
            className="w-full border border-rhine-line bg-rhine-panel px-3 py-2.5 font-mono text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
          >
            {groups.map((group) => (
              <optgroup key={group.title} label={group.title}>
                {group.items.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.subgroup ? `${item.subgroup} / ${item.label}` : item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="hidden lg:block lg:w-56 lg:shrink-0">
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
              {current === 'forum-maintenance' && <ForumMaintenancePanel />}
              {current === 'forum-members' && <ForumMembersPanel />}
              {current === 'review-access' && <ReviewAccessPanel />}
              {current === 'review-posts' && <ReviewPanel postsOnly />}
              {current === 'review-logs' && <ReviewLogsPanel />}
              {current === 'members' && <MembersPanel user={user} />}
              {current === 'reports' && <ReportsPanel />}
              {current === 'moderation' && <ModerationPanel />}
              {current === 'security-logs' && <SecurityLogsPanel />}
              {current === 'themes' && (
                <ThemesPanel
                  canDelete={
                    user.isSuper || user.permissions.includes('themes.manage')
                  }
                />
              )}
              {current === 'settings' && <SettingsPanel user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
