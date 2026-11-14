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

const CATEGORY_OPTIONS: Array<{ access: BoardAccess; label: string; hint: string }> = [
  { access: 'public', label: '普通论坛', hint: '公开版块' },
  { access: 'core', label: '核心论坛', hint: '核心成员' },
  { access: 'special', label: '特殊论坛', hint: '特别授权' },
]

const CATEGORY_KEYS: Record<BoardAccess, string> = {
  public: 'forum.category.public.master',
  core: 'forum.category.core.master',
  special: 'forum.category.special.master',
}

const CREATE_KEYS: Record<BoardAccess, string> = {
  public: 'forum.category.public.create',
  core: 'forum.category.core.create',
  special: 'forum.category.special.create',
}

const BOARD_ACTIONS = [
  { key: 'announcements', label: '公告' },
  { key: 'review', label: '待审' },
  { key: 'post.autoapprove', label: '免审' },
] as const

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
  const toggle = (key: string, checked: boolean) => {
    apply(checked ? [...value, key] : value.filter((item) => item !== key))
  }

  const forumMaster = has('forum')
  const categoryMaster = (access: BoardAccess) => has(CATEGORY_KEYS[access])
  const categoryBoards = (access: BoardAccess) =>
    boards.filter((board) => board.access === access)

  const categoryDerived = (access: BoardAccess) =>
    forumMaster || categoryMaster(access)
  const boardFull = (board: Board) =>
    categoryDerived(board.access) || has(`forum.${board.id}`)

  const toggleForumMaster = (checked: boolean) => {
    let next = value.filter(
      (item) =>
        item !== 'forum' &&
        !Object.values(CATEGORY_KEYS).includes(item) &&
        !Object.values(CREATE_KEYS).includes(item) &&
        !/^forum\.\d+(\..+)?$/.test(item),
    )
    if (checked) next.push('forum')
    apply(next)
  }

  const toggleCategoryMaster = (access: BoardAccess, checked: boolean) => {
    const keys = new Set<string>([CATEGORY_KEYS[access], CREATE_KEYS[access]])
    for (const board of categoryBoards(access)) {
      keys.add(`forum.${board.id}`)
      keys.add(`forum.${board.id}.announcements`)
      keys.add(`forum.${board.id}.review`)
      keys.add(`forum.${board.id}.post.autoapprove`)
    }
    let next = value.filter((item) => !keys.has(item))
    if (checked) next.push(CATEGORY_KEYS[access], ...keys)
    apply(next)
  }

  const toggleBoardFull = (board: Board, checked: boolean) => {
    const children = [
      `forum.${board.id}.announcements`,
      `forum.${board.id}.review`,
      `forum.${board.id}.post.autoapprove`,
    ]
    let next = value.filter((item) => item !== `forum.${board.id}` && !children.includes(item))
    if (checked) next.push(`forum.${board.id}`)
    apply(next)
  }

  const toggleChild = (board: Board, action: string, checked: boolean) => {
    const key = `forum.${board.id}.${action}`
    toggle(key, checked)
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
      <div className="flex flex-col gap-2 border border-rhine-line/60 bg-rhine-panel/80 p-2.5 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索论坛名 / slug / ID"
          className="h-9 w-full min-w-0 border border-rhine-line bg-rhine-abyss px-2.5 font-mono text-[11px] outline-none focus:border-rhine-gold/60 sm:max-w-xs"
        />
        <p className="font-mono text-[9px] leading-relaxed text-rhine-faint sm:ml-auto sm:text-right">
          四个总管理权限可批量联动，单项权限仍可单独勾选
        </p>
      </div>

      <section className="border border-rhine-line/60 bg-rhine-abyss/20 p-3">
        <div className="mb-2 flex items-end justify-between gap-2">
          <p className="font-mono text-[9px] tracking-[0.22em] text-rhine-gold">
            四个总管理权限
          </p>
          <span className="font-mono text-[8px] text-rhine-faint">批量授权</span>
        </div>

        <label
          className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
            forumMaster
              ? 'border-rhine-gold/50 bg-rhine-gold/[0.07]'
              : 'border-rhine-line/60 bg-rhine-panel/30 hover:border-rhine-gold/30'
          }`}
        >
          <input
            type="checkbox"
            checked={forumMaster}
            onChange={(event) => toggleForumMaster(event.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 shrink-0 accent-rhine-gold"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="whitespace-nowrap text-xs font-medium text-rhine-ink">
                论坛总管理
              </span>
              <span className="whitespace-nowrap border border-rhine-gold/30 px-1.5 py-0.5 font-mono text-[8px] text-rhine-gold">
                ALL FORUMS
              </span>
              <code className="ml-auto whitespace-nowrap font-mono text-[8px] text-rhine-faint">
                forum
              </code>
            </span>
            <span className="mt-1 block text-[10px] leading-relaxed text-rhine-dim">
              所有类别、所有论坛的全部权限；勾选后自动覆盖下方全部单项。
            </span>
          </span>
        </label>

        <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
          {CATEGORY_OPTIONS.map(({ access, label, hint }) => {
            const checked = categoryDerived(access)
            return (
              <label
                key={access}
                className={`flex cursor-pointer items-start gap-2.5 border p-3 transition-colors ${
                  checked
                    ? 'border-rhine-gold/40 bg-rhine-gold/[0.05]'
                    : 'border-rhine-line/60 bg-rhine-panel/30 hover:border-rhine-gold/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => toggleCategoryMaster(access, event.target.checked)}
                  disabled={disabled || forumMaster}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-rhine-gold"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="whitespace-nowrap text-[11px] font-medium text-rhine-ink">
                      {label}总管理
                    </span>
                    <span className="whitespace-nowrap font-mono text-[8px] text-rhine-faint">
                      {hint}
                    </span>
                  </span>
                  <code className="mt-1 block truncate whitespace-nowrap font-mono text-[8px] text-rhine-faint">
                    {CATEGORY_KEYS[access]}
                  </code>
                </span>
              </label>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-rhine-faint">
          勾选总管理会自动勾选对应全部权限（含创建、公告、审核、免审、版务）；取消会同步移除。
          单项权限仍可在下方单独勾选，总管理未勾选时生效。
        </p>
      </section>

      <section className="border border-rhine-line/60 bg-rhine-abyss/20 p-3">
        <div className="mb-2 flex items-end justify-between gap-2">
          <p className="font-mono text-[9px] tracking-[0.22em] text-rhine-gold">
            分类论坛权限
          </p>
          <span className="font-mono text-[8px] text-rhine-faint">可单独勾选</span>
        </div>

        <div className="space-y-3">
          {CATEGORY_OPTIONS.map(({ access, label }) => {
            const filtered = filteredBoards.filter((board) => board.access === access)
            const derived = categoryDerived(access)
            return (
              <details
                key={access}
                open
                className="overflow-hidden border border-rhine-line/50 bg-rhine-panel/20"
              >
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 border-b border-rhine-line/30 px-2.5 py-2 font-mono text-[10px] text-rhine-dim">
                  <span className="text-rhine-gold">{label}</span>
                  <span className="text-rhine-faint">{filtered.length} 个论坛</span>
                  <label className="ml-auto flex items-center gap-1.5 whitespace-nowrap text-[9px] text-rhine-faint">
                    <input
                      type="checkbox"
                      checked={derived || has(CREATE_KEYS[access])}
                      onChange={(event) => toggle(CREATE_KEYS[access], event.target.checked)}
                      disabled={disabled || derived}
                      className="h-3.5 w-3.5 accent-rhine-gold"
                    />
                    创建论坛
                  </label>
                  {derived && (
                    <span className="border border-rhine-gold/30 px-1.5 py-0.5 text-[8px] text-rhine-gold">
                      总管理覆盖
                    </span>
                  )}
                </summary>

                <div className="max-h-80 overflow-y-auto p-2">
                  <div className="grid grid-cols-1 gap-2">
                    {filtered.map((board) => {
                      const full = boardFull(board)
                      return (
                        <div
                          key={board.id}
                          className={`border p-2.5 ${
                            full
                              ? 'border-rhine-gold/25 bg-rhine-gold/[0.03]'
                              : 'border-rhine-line/40'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                full ? 'bg-rhine-gold' : 'bg-rhine-line'
                              }`}
                            />
                            <span className="min-w-0 flex-1 truncate text-[11px] text-rhine-ink">
                              {board.name}
                            </span>
                            <span className="shrink-0 font-mono text-[8px] text-rhine-faint">
                              #{board.id}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            <label className="flex min-w-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border border-rhine-line/50 px-1.5 py-1 font-mono text-[9px] text-rhine-dim">
                              <input
                                type="checkbox"
                                checked={full}
                                onChange={(event) => toggleBoardFull(board, event.target.checked)}
                                disabled={disabled || derived}
                                className="h-3 w-3 shrink-0 accent-rhine-gold"
                              />
                              版务
                            </label>
                            {BOARD_ACTIONS.map((action) => (
                              <label
                                key={action.key}
                                className="flex min-w-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border border-rhine-line/50 px-1.5 py-1 font-mono text-[9px] text-rhine-dim"
                                title={`forum.${board.id}.${action.key}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={full || has(`forum.${board.id}.${action.key}`)}
                                  onChange={(event) =>
                                    toggleChild(board, action.key, event.target.checked)
                                  }
                                  disabled={disabled || full}
                                  className="h-3 w-3 shrink-0 accent-rhine-gold"
                                />
                                {action.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    {filtered.length === 0 && (
                      <p className="col-span-full py-3 text-center font-mono text-[9px] text-rhine-faint">
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
                    onChange={(event) => toggle(item.key, event.target.checked)}
                    disabled={disabled}
                    className="h-3.5 w-3.5 accent-rhine-gold"
                  />
                  {item.label}
                  <span className="ml-auto hidden text-[8px] text-rhine-faint sm:inline">
                    {item.key}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
