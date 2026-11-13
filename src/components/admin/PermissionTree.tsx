import { useMemo, useState } from 'react'
import type { Board } from '../../lib/api'
import { PERMISSION_LABELS } from '../../lib/adminPermissions'

interface PermissionTreeProps {
  value: string[]
  onChange: (next: string[]) => void
  boards: Board[]
  allowMemberPermissions: boolean
  disabled?: boolean
}

interface PermissionItem {
  key: string
  label: string
}

const GLOBAL_GROUPS: Array<{ title: string; items: PermissionItem[] }> = [
  {
    title: '后台与主页',
    items: [
      { key: 'admin.overview', label: '后台总览' },
      { key: 'home.edit', label: '主页资料' },
    ],
  },
  {
    title: '档案',
    items: [
      { key: 'archive.articles', label: '文章' },
      { key: 'archive.photos', label: '照片' },
      { key: 'archive.videos', label: '视频' },
      { key: 'projects', label: '项目库' },
      { key: 'logs', label: '日志内容' },
    ],
  },
  {
    title: '互动与安全',
    items: [
      { key: 'guestbook', label: '留言板' },
      { key: 'reports.manage', label: '举报处理' },
      { key: 'moderation.manage', label: '内容安全' },
      { key: 'review.logs', label: '审核日志' },
      { key: 'security.logs', label: '安全日志' },
      { key: 'access_logs', label: '访问日志' },
      { key: 'security.readonly', label: '安全只读' },
      { key: 'themes.manage', label: '主题颜色' },
    ],
  },
]

const FORUM_GLOBAL: PermissionItem[] = [
  { key: 'forum', label: '全部论坛（含未来新增）' },
  { key: 'forum.maintenance', label: '论坛创建与维护' },
  { key: 'forum.members', label: '论坛成员管理' },
  { key: 'forum.announcements', label: '论坛公告' },
  { key: 'forum.create', label: '创建论坛' },
  { key: 'forum.category.public.master', label: '普通论坛总管理' },
  { key: 'forum.category.core.master', label: '核心论坛总管理' },
  { key: 'forum.category.special.master', label: '特殊论坛总管理' },
  { key: 'forum.review', label: '待审帖子' },
  { key: 'forum.access', label: '特殊/核心论坛申请' },
  { key: 'forum.post.autoapprove', label: '帖子免审' },
]

const BOARD_ACTIONS = [
  { key: 'post.publish', label: '发帖' },
  { key: 'post.pin', label: '置顶' },
  { key: 'post.hide', label: '隐藏' },
  { key: 'post.delete', label: '删帖' },
  { key: 'post.review', label: '审帖' },
  { key: 'post.autoapprove', label: '本论坛免审' },
  { key: 'reply.delete', label: '删回复' },
  { key: 'reply.review', label: '审回复' },
]

const ACCESS_LABELS: Record<string, string> = {
  all: '全部类别',
  public: '普通论坛',
  special: '特殊论坛',
  core: '核心论坛',
}

export function PermissionTree({
  value,
  onChange,
  boards,
  allowMemberPermissions,
  disabled = false,
}: PermissionTreeProps) {
  const [query, setQuery] = useState('')
  const [access, setAccess] = useState('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [globalOpen, setGlobalOpen] = useState(true)
  const has = (key: string) => value.includes(key)
  const apply = (next: string[]) => {
    if (!disabled) onChange([...new Set(next)])
  }
  const toggle = (key: string, checked: boolean) => {
    const next = checked
      ? [...value.filter((item) => item !== key), key]
      : value.filter((item) => item !== key)
    apply(next)
  }

  const filteredBoards = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return boards.filter((board) => {
      if (access !== 'all' && board.access !== access) return false
      if (!keyword) return true
      return (
        board.name.toLowerCase().includes(keyword) ||
        board.slug.toLowerCase().includes(keyword) ||
        String(board.id) === keyword
      )
    })
  }, [boards, query, access])

  const membersItems: PermissionItem[] = [
    { key: 'members.manage', label: '成员管理' },
    { key: 'members.grant', label: '授权权限' },
  ]

  const toggleBoard = (boardId: number, checked: boolean) => {
    const key = `forum.${boardId}`
    const next = value.filter((item) => item !== key && !item.startsWith(`${key}.`))
    if (checked) next.push(key)
    apply(next)
  }

  const toggleAction = (boardId: number, action: string, checked: boolean) => {
    const key = `forum.${boardId}.${action}`
    const next = checked
      ? [...value.filter((item) => item !== key), key]
      : value.filter((item) => item !== key)
    apply(next)
  }

  const selectFiltered = () => {
    const keys = filteredBoards.map((board) => `forum.${board.id}`)
    apply([...value, ...keys.filter((key) => !value.includes(key))])
  }

  const clearFiltered = () => {
    const ids = new Set(filteredBoards.map((board) => board.id))
    apply(
      value.filter((item) => {
        const match = /^forum\.(\d+)/.exec(item)
        return !match || !ids.has(Number(match[1]))
      }),
    )
  }

  const globalForum = has('forum')
  const selectedBoards = boards.filter((board) => has(`forum.${board.id}`)).length

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border border-rhine-line/60 bg-rhine-panel p-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索权限或论坛名 / slug / ID"
          className="min-w-40 flex-1 border border-rhine-line bg-rhine-abyss px-2 py-1.5 font-mono text-[10px] outline-none focus:border-rhine-gold/60"
        />
        <span className="font-mono text-[9px] text-rhine-faint">
          已选 {value.length} 项 · 论坛 {selectedBoards}/{boards.length}
        </span>
        <button
          type="button"
          onClick={() => apply([])}
          disabled={disabled}
          className="border border-rhine-line px-2 py-1 font-mono text-[9px] text-rhine-dim disabled:opacity-40"
        >
          清空
        </button>
      </div>

      <details
        open={globalOpen}
        onToggle={(event) => setGlobalOpen((event.target as HTMLDetailsElement).open)}
        className="border border-rhine-line/60 bg-rhine-abyss/20"
      >
        <summary className="cursor-pointer px-3 py-2 font-mono text-[9px] tracking-[0.24em] text-rhine-gold">
          全局模块权限
        </summary>
        <div className="grid gap-3 border-t border-rhine-line/40 p-3 md:grid-cols-2">
          {GLOBAL_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="font-mono text-[8px] tracking-[0.22em] text-rhine-faint">{group.title}</p>
              {group.items.map((item) => (
                <label key={item.key} className="flex items-center gap-2 font-mono text-[10px] text-rhine-dim">
                  <input
                    type="checkbox"
                    checked={has(item.key)}
                    onChange={(event) => toggle(item.key, event.target.checked)}
                    disabled={disabled}
                  />
                  {item.label}
                  <span className="ml-auto text-[8px] text-rhine-faint">{item.key}</span>
                </label>
              ))}
            </div>
          ))}
          {allowMemberPermissions && (
            <div className="space-y-1">
              <p className="font-mono text-[8px] tracking-[0.22em] text-rhine-faint">仅超管可授予</p>
              {membersItems.map((item) => (
                <label key={item.key} className="flex items-center gap-2 font-mono text-[10px] text-rhine-dim">
                  <input
                    type="checkbox"
                    checked={has(item.key)}
                    onChange={(event) => toggle(item.key, event.target.checked)}
                    disabled={disabled}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </details>

      <details open className="border border-rhine-line/60 bg-rhine-abyss/20">
        <summary className="cursor-pointer px-3 py-2 font-mono text-[9px] tracking-[0.24em] text-rhine-gold">
          论坛权限 · 可搜索 / 分类 / 批量
        </summary>
        <div className="space-y-3 border-t border-rhine-line/40 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {FORUM_GLOBAL.map((item) => (
              <label key={item.key} className="flex items-center gap-2 font-mono text-[10px] text-rhine-dim">
                <input
                  type="checkbox"
                  checked={has(item.key)}
                  onChange={(event) => toggle(item.key, event.target.checked)}
                  disabled={disabled}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-rhine-line/40 pt-2">
            <select
              value={access}
              onChange={(event) => setAccess(event.target.value)}
              className="border border-rhine-line bg-rhine-abyss px-2 py-1.5 font-mono text-[10px] text-rhine-dim outline-none"
            >
              {Object.entries(ACCESS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <span className="font-mono text-[9px] text-rhine-faint">
              {filteredBoards.length} 个论坛
            </span>
            <button
              type="button"
              onClick={selectFiltered}
              disabled={disabled || globalForum}
              className="border border-rhine-line px-2 py-1 font-mono text-[9px] text-rhine-dim disabled:opacity-40"
            >
              全选结果
            </button>
            <button
              type="button"
              onClick={clearFiltered}
              disabled={disabled || globalForum}
              className="border border-rhine-line px-2 py-1 font-mono text-[9px] text-rhine-dim disabled:opacity-40"
            >
              清空结果
            </button>
          </div>

          <div className="max-h-96 space-y-1 overflow-y-auto border border-rhine-line/40 p-2">
            {filteredBoards.map((board) => {
              const boardKey = `forum.${board.id}`
              const boardChecked = globalForum || has(boardKey)
              const isExpanded = expanded === board.id
              return (
                <div key={board.id} className="border border-rhine-line/30 bg-rhine-panel/20">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={boardChecked}
                      onChange={(event) => toggleBoard(board.id, event.target.checked)}
                      disabled={disabled || globalForum}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-rhine-ink">
                      {board.name}
                      <span className="ml-1 text-rhine-faint">#{board.id}</span>
                    </span>
                    <span className="font-mono text-[8px] text-rhine-faint">
                      {ACCESS_LABELS[board.access] ?? board.access}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : board.id)}
                      className="font-mono text-[8px] text-rhine-cyan"
                    >
                      {isExpanded ? '收起' : '细分'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="grid grid-cols-2 gap-1 border-t border-rhine-line/30 px-4 py-2 sm:grid-cols-4">
                      {BOARD_ACTIONS.map((action) => {
                        const key = `forum.${board.id}.${action.key}`
                        return (
                          <label key={key} className="flex items-center gap-1 font-mono text-[9px] text-rhine-dim">
                            <input
                              type="checkbox"
                              checked={boardChecked || has(key)}
                              onChange={(event) => toggleAction(board.id, action.key, event.target.checked)}
                              disabled={disabled || globalForum || boardChecked}
                            />
                            {action.label}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredBoards.length === 0 && (
              <p className="py-4 text-center font-mono text-[10px] text-rhine-faint">没有匹配的论坛</p>
            )}
          </div>
          {globalForum && (
            <p className="font-mono text-[9px] text-rhine-gold">
              已勾选“全部论坛”，单项论坛权限不再需要；取消全部论坛后可逐项分配。
            </p>
          )}
          {!allowMemberPermissions && (
            <p className="font-mono text-[9px] text-rhine-faint">
              成员与权限相关权限仅超级管理员可授予。
            </p>
          )}
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        {Object.entries(PERMISSION_LABELS)
          .filter(([key]) => has(key))
          .slice(0, 24)
          .map(([key, label]) => (
            <span key={key} className="border border-rhine-gold/30 px-1.5 py-0.5 font-mono text-[8px] text-rhine-gold">
              {label}
            </span>
          ))}
      </div>
    </div>
  )
}
