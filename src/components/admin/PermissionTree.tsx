import { useMemo, useState } from 'react'
import type { Board, BoardAccess } from '../../lib/api'

interface PermissionTreeProps {
  value: string[]
  onChange: (next: string[]) => void
  boards: Board[]
  allowMemberPermissions?: boolean
  disabled?: boolean
}

const GLOBAL_GROUPS = [
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

const CATEGORY_OPTIONS: Array<{ access: BoardAccess; label: string }> = [
  { access: 'public', label: '普通论坛' },
  { access: 'core', label: '核心论坛' },
  { access: 'special', label: '特殊论坛' },
]

const CATEGORY_KEYS: Record<BoardAccess, string> = {
  public: 'forum.category.public.master',
  core: 'forum.category.core.master',
  special: 'forum.category.special.master',
}

export function PermissionTree({
  value,
  onChange,
  boards,
  disabled = false,
}: PermissionTreeProps) {
  const [query, setQuery] = useState('')
  const has = (key: string) => value.includes(key)
  const apply = (next: string[]) => {
    if (!disabled) onChange([...new Set(next)])
  }
  const toggleGlobal = (key: string, checked: boolean) => {
    const next = checked
      ? [...value.filter((item) => item !== key), key]
      : value.filter((item) => item !== key)
    apply(next)
  }

  const forumMaster = has('forum')
  const boardKeys = (access: BoardAccess) =>
    boards.filter((board) => board.access === access).map((board) => `forum.${board.id}`)

  const toggleCategory = (access: BoardAccess, checked: boolean) => {
    const key = CATEGORY_KEYS[access]
    let next = value.filter((item) => item !== key)
    const keys = new Set(boardKeys(access))
    next = next.filter((item) => !keys.has(item))
    if (checked) {
      next.push(key, ...keys)
    }
    apply(next)
  }

  const toggleForumMaster = (checked: boolean) => {
    let next = value.filter(
      (item) =>
        item !== 'forum' &&
        !Object.values(CATEGORY_KEYS).includes(item) &&
        !/^forum\.\d+$/.test(item),
    )
    if (checked) next.push('forum')
    apply(next)
  }

  const filteredBoards = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return boards
    return boards.filter(
      (board) =>
        board.name.toLowerCase().includes(keyword) ||
        board.slug.toLowerCase().includes(keyword) ||
        String(board.id) === keyword,
    )
  }, [boards, query])

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border border-rhine-line/60 bg-rhine-panel p-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索论坛名 / slug / ID"
          className="min-w-40 flex-1 border border-rhine-line bg-rhine-abyss px-2 py-1.5 font-mono text-[10px] outline-none focus:border-rhine-gold/60"
        />
        <span className="font-mono text-[9px] text-rhine-faint">
          论坛总管理 / 三个类别总管理可勾选，其余权限自动联动
        </span>
      </div>

      <section className="border border-rhine-line/60 bg-rhine-abyss/20 p-3">
        <p className="mb-2 font-mono text-[9px] tracking-[0.22em] text-rhine-gold">
          四个总管理权限
        </p>
        <label className="flex items-center gap-2 border border-rhine-gold/30 bg-rhine-gold/[0.04] px-2 py-2 font-mono text-[10px] text-rhine-ink">
          <input
            type="checkbox"
            checked={forumMaster}
            onChange={(event) => toggleForumMaster(event.target.checked)}
            disabled={disabled}
          />
          论坛总管理（所有类别、所有论坛的全部权限）
          <span className="ml-auto text-[8px] text-rhine-faint">forum</span>
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {CATEGORY_OPTIONS.map(({ access, label }) => (
            <label
              key={access}
              className="flex items-center gap-2 border border-rhine-line/60 bg-rhine-panel/30 px-2 py-2 font-mono text-[10px] text-rhine-dim"
            >
              <input
                type="checkbox"
                checked={forumMaster || has(CATEGORY_KEYS[access])}
                onChange={(event) => toggleCategory(access, event.target.checked)}
                disabled={disabled || forumMaster}
              />
              {label}总管理
              <span className="ml-auto text-[8px] text-rhine-faint">{CATEGORY_KEYS[access]}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-rhine-faint">
          勾选后自动包含对应全部论坛权限（含创建、公告、审核、免审、版务）。取消勾选会同步移除对应派生权限。
        </p>
      </section>

      <section className="border border-rhine-line/60 bg-rhine-abyss/20 p-3">
        <p className="mb-2 font-mono text-[9px] tracking-[0.22em] text-rhine-gold">
          类别论坛权限（自动联动，不可单独勾选）
        </p>
        <div className="space-y-3">
          {CATEGORY_OPTIONS.map(({ access, label }) => {
            const categoryBoards = filteredBoards.filter((board) => board.access === access)
            const categoryChecked = forumMaster || has(CATEGORY_KEYS[access])
            return (
              <details key={access} open className="border border-rhine-line/50">
                <summary className="cursor-pointer px-2 py-1.5 font-mono text-[10px] text-rhine-dim">
                  {label} · {categoryBoards.length} 个论坛
                  {categoryChecked ? ' · 全部权限已开启' : ' · 仅显示已有子管理员权限'}
                </summary>
                <div className="max-h-64 overflow-y-auto border-t border-rhine-line/30 p-2">
                  <div className="grid gap-1 sm:grid-cols-2">
                    {categoryBoards.map((board) => {
                      const checked = categoryChecked || has(`forum.${board.id}`)
                      return (
                        <div
                          key={board.id}
                          className={`border px-2 py-1.5 font-mono text-[9px] ${
                            checked
                              ? 'border-rhine-gold/30 bg-rhine-gold/[0.04] text-rhine-dim'
                              : 'border-rhine-line/40 text-rhine-faint'
                          }`}
                        >
                          <span className="block truncate">
                            {checked ? '✓ ' : '○ '}
                            {board.name}
                            <span className="ml-1 opacity-60">#{board.id}</span>
                          </span>
                          <span className="mt-0.5 block text-[8px] opacity-70">
                            {checked
                              ? '全部版务 · 公告 · 创建 · 待审 · 免审'
                              : '由论坛成员管理分配子管理员'}
                          </span>
                        </div>
                      )
                    })}
                    {categoryBoards.length === 0 && (
                      <p className="py-2 text-center font-mono text-[9px] text-rhine-faint">
                        没有匹配的论坛
                      </p>
                    )}
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      </section>

      <details open className="border border-rhine-line/60 bg-rhine-abyss/20">
        <summary className="cursor-pointer px-3 py-2 font-mono text-[9px] tracking-[0.24em] text-rhine-gold">
          非论坛后台权限
        </summary>
        <div className="grid gap-3 border-t border-rhine-line/40 p-3 md:grid-cols-2">
          {GLOBAL_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="font-mono text-[8px] tracking-[0.22em] text-rhine-faint">
                {group.title}
              </p>
              {group.items.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 font-mono text-[10px] text-rhine-dim"
                >
                  <input
                    type="checkbox"
                    checked={has(item.key)}
                    onChange={(event) => toggleGlobal(item.key, event.target.checked)}
                    disabled={disabled}
                  />
                  {item.label}
                  <span className="ml-auto text-[8px] text-rhine-faint">{item.key}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
