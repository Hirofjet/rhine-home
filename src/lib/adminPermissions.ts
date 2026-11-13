import type { ApiUser } from './api'

export type AdminPanelKey =
  | 'overview'
  | 'home-profile'
  | 'projects'
  | 'articles'
  | 'photos'
  | 'videos'
  | 'logs'
  | 'guestbook'
  | 'forum-maintenance'
  | 'forum-members'
  | 'forum-announcements'
  | 'review-access'
  | 'review-posts'
  | 'review-logs'
  | 'members'
  | 'reports'
  | 'moderation'
  | 'security-logs'
  | 'themes'
  | 'settings'

const FORUM_MANAGER = 'forum'
const FORUM_BOARD = /^forum\.\d+$/

const hasAny = (user: ApiUser, keys: string[]) =>
  user.isSuper || keys.some((key) => user.permissions.includes(key))

const hasForum = (user: ApiUser) =>
  hasAny(user, [FORUM_MANAGER, 'forum.maintenance', 'forum.create']) ||
  user.permissions.some((permission) => FORUM_BOARD.test(permission))

/** 后台面板统一权限入口。settings 是唯一无额外权限要求的 staff 面板。 */
export function canAccessPanel(user: ApiUser | null, panel: AdminPanelKey): boolean {
  if (!user) return false
  if (user.isSuper) return true
  switch (panel) {
    case 'settings':
      return true
    case 'members':
      return false
    case 'overview':
      return user.permissions.includes('admin.overview')
    case 'home-profile':
      return user.permissions.includes('home.edit')
    case 'articles':
      return user.permissions.includes('archive.articles')
    case 'photos':
      return user.permissions.includes('archive.photos')
    case 'videos':
      return user.permissions.includes('archive.videos')
    case 'projects':
      return user.permissions.includes('projects')
    case 'logs':
      return user.permissions.includes('logs')
    case 'guestbook':
      return user.permissions.includes('guestbook')
    case 'forum-maintenance':
      return hasForum(user)
    case 'forum-members':
      return hasAny(user, ['forum', 'forum.members'])
    case 'forum-announcements':
      return hasAny(user, ['forum', 'forum.announcements'])
    case 'review-access':
      return hasAny(user, ['forum', 'forum.access'])
    case 'review-posts':
      return hasAny(user, ['forum', 'forum.review'])
    case 'review-logs':
      return hasAny(user, ['review.logs', 'security.logs', 'access_logs'])
    case 'reports':
      return hasAny(user, ['reports.manage']) ||
        user.permissions.includes('members.manage')
    case 'moderation':
      return hasAny(user, ['moderation.manage']) ||
        user.permissions.includes('members.manage')
    case 'security-logs':
      return hasAny(user, ['security.logs', 'access_logs', 'security.readonly'])
    case 'themes':
      return hasAny(user, ['themes.manage'])
    default:
      return false
  }
}

export const PERMISSION_LABELS: Record<string, string> = {
  'admin.overview': '后台总览',
  'home.edit': '主页资料',
  'archive.articles': '文章管理',
  'archive.photos': '照片管理',
  'archive.videos': '视频管理',
  projects: '项目库',
  logs: '日志内容',
  guestbook: '留言板',
  forum: '全部论坛',
  'forum.maintenance': '论坛创建与维护',
  'forum.members': '论坛成员管理',
  'forum.announcements': '论坛公告',
  'forum.create': '创建论坛',
  'forum.category.public.master': '普通论坛总管理',
  'forum.category.core.master': '核心论坛总管理',
  'forum.category.special.master': '特殊论坛总管理',
  'forum.review': '待审帖子',
  'forum.access': '特殊/核心论坛申请',
  'forum.post.autoapprove': '全论坛帖子免审',
  'review.logs': '审核日志',
  'reports.manage': '举报处理',
  'moderation.manage': '内容安全',
  'members.manage': '成员管理（仅超管）',
  'members.grant': '权限授予（仅超管）',
  access_logs: '访问日志',
  'security.logs': '安全日志',
  'themes.manage': '主题颜色',
  'security.readonly': '安全只读',
}
