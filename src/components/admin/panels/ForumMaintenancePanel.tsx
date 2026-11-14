/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Megaphone,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import {
  adminApi,
  errorMessage,
  forumApi,
  type Announcement,
  type Board,
  type BoardAccess,
} from '../../../lib/api'
import { useSession } from '../../auth/useSession'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
  AdminTextarea,
} from '../AdminUi'

export const BOARD_ACCESS_LABELS: Record<BoardAccess, string> = {
  public: '普通论坛',
  core: '核心论坛',
  special: '特殊论坛',
}

const CATEGORIES: BoardAccess[] = ['public', 'core', 'special']

interface Rule {
  level: number
  minPoints: number
  title: string
}

interface BoardPost {
  id: number
  title: string
  status: string
  pinned: boolean
  author: string
  replyCount: number
  createdAt: string
}

function canManageBoard(user: ReturnType<typeof useSession>['user'], board: Board) {
  if (!user) return false
  return (
    user.isSuper ||
    user.permissions.includes('forum') ||
    board.canModerate === true ||
    canManageCategory(user, board.access)
  )
}

const CATEGORY_IDENTITY: Record<BoardAccess, string> = {
  public: 'normal_master',
  core: 'core_master',
  special: 'special_master',
}

function canManageCategory(user: ReturnType<typeof useSession>['user'], access: BoardAccess) {
  if (!user) return false
  if (user.isSuper || user.permissions.includes('forum')) return true
  if (['senior', 'forum_master'].includes(user.identity ?? '')) return true
  if (user.identity === CATEGORY_IDENTITY[access]) return true
  return user.permissions.includes(`forum.category.${access}.master`)
}

export function ForumMaintenancePanel() {
  const { user } = useSession()
  const [boards, setBoards] = useState<Board[]>([])
  const [category, setCategory] = useState<BoardAccess>('public')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const manageable = useMemo(
    () => boards.filter((board) => canManageBoard(user, board)),
    [boards, user],
  )
  const categoryBoards = useMemo(
    () => manageable.filter((board) => board.access === category),
    [manageable, category],
  )
  const selected = selectedId ? manageable.find((board) => board.id === selectedId) ?? null : null
  const canCreate =
    canManageCategory(user, category) ||
    user?.permissions.includes(`forum.category.${category}.create`)

  const loadBoards = useCallback(async () => {
    try {
      const data = await adminApi.forumBoards()
      setBoards(data.boards)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void loadBoards()
  }, [loadBoards])

  useEffect(() => {
    if (manageable.length === 0 || categoryTouched) return
    if (categoryBoards.length > 0) return
    const next = CATEGORIES.find((item) =>
      manageable.some((board) => board.access === item),
    )
    if (next && next !== category) setCategory(next)
  }, [manageable, categoryBoards.length, category, categoryTouched])

  const refresh = async () => {
    await loadBoards()
  }

  const counts = CATEGORIES.map((item) => ({
    item,
    label: BOARD_ACCESS_LABELS[item],
    count: manageable.filter((board) => board.access === item).length,
  }))

  if (selected) {
    return (
      <BoardDetail
        board={selected}
        user={user}
        onBack={() => {
          setSelectedId(null)
          void loadBoards()
        }}
        onNotice={setNotice}
        notice={notice}
        error={error}
        setError={setError}
        busy={busy}
        setBusy={setBusy}
      />
    )
  }

  const totalPosts = categoryBoards.reduce((sum, board) => sum + board.postCount, 0)
  const totalReplies = categoryBoards.reduce((sum, board) => sum + (board.replyCount ?? 0), 0)
  const totalPending = categoryBoards.reduce((sum, board) => sum + (board.pendingCount ?? 0), 0)
  const maxPosts = Math.max(1, ...categoryBoards.map((board) => board.postCount))

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="论坛创建与维护"
        subtitle={`${BOARD_ACCESS_LABELS[category]} · CATEGORY WORKSPACE`}
        actions={
          <AdminButton variant="ghost" onClick={() => void refresh()} disabled={busy}>
            <RefreshCw className="h-3 w-3" /> 刷新
          </AdminButton>
        }
      >
        <div className="mb-4 grid grid-cols-3 gap-2 border border-rhine-line/60 bg-rhine-abyss/30 p-2">
          {counts.map(({ item, label, count }) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCategory(item)
                setCategoryTouched(true)
                setSelectedId(null)
              }}
              className={`border px-3 py-3 text-left transition-colors ${
                category === item
                  ? 'border-rhine-gold bg-rhine-gold/10 text-rhine-gold'
                  : 'border-rhine-line/60 text-rhine-dim hover:border-rhine-gold/50'
              }`}
            >
              <span className="block font-mono text-[9px] tracking-[0.2em]">{label}</span>
              <span className="mt-1 block text-xl">{count}</span>
              <span className="font-mono text-[9px] opacity-60">个论坛</span>
            </button>
          ))}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">当前类别论坛</p>
            <p className="mt-1 text-xl text-rhine-gold">{categoryBoards.length}</p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">帖子 / 回复</p>
            <p className="mt-1 text-xl text-rhine-cyan">
              {totalPosts} / {totalReplies}
            </p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">待审内容</p>
            <p className="mt-1 text-xl text-rhine-red">{totalPending}</p>
          </div>
        </div>

        <div className="mb-4 flex h-32 items-end gap-2 border border-rhine-line/60 p-3">
          {categoryBoards.map((board) => (
            <div key={board.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className="w-full bg-rhine-gold/60"
                style={{ height: `${Math.max(6, (board.postCount / maxPosts) * 85)}px` }}
                title={`${board.name}: ${board.postCount} 帖 / ${board.replyCount ?? 0} 回`}
              />
              <span className="w-full truncate text-center font-mono text-[9px] text-rhine-faint">
                {board.name}
              </span>
            </div>
          ))}
          {categoryBoards.length === 0 && (
            <span className="text-xs text-rhine-faint">当前类别暂无你有权限管理的论坛</span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categoryBoards.map((board) => (
            <article
              key={board.id}
              className="group border border-rhine-line/70 bg-rhine-panel/40 p-4 transition-colors hover:border-rhine-gold/50"
            >
              <button type="button" className="w-full text-left" onClick={() => setSelectedId(board.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] tracking-wider text-rhine-gold">
                    {BOARD_ACCESS_LABELS[board.access]}
                  </span>
                  <span className="font-mono text-[9px] text-rhine-faint">{board.postCount} 帖</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-rhine-ink">{board.name}</h3>
                <p className="mt-1 min-h-8 text-xs leading-relaxed text-rhine-dim">
                  {board.description || '暂无描述'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(board.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="border border-rhine-line px-1.5 py-0.5 font-mono text-[9px] text-rhine-faint"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-rhine-line/50 pt-3 font-mono text-[10px] text-rhine-cyan">
                  <span>进入板块后台</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </article>
          ))}
          {categoryBoards.length === 0 && (
            <div className="border border-dashed border-rhine-line/70 p-8 text-center font-mono text-xs text-rhine-faint md:col-span-2 xl:col-span-3">
              当前类别暂无你有权限管理的论坛
            </div>
          )}
        </div>
      </AdminPanel>

      {canCreate && (
        <AdminPanel
          title={`在「${BOARD_ACCESS_LABELS[category]}」创建论坛`}
          subtitle="CREATE FORUM"
        >
          <p className="mb-3 font-mono text-[9px] leading-relaxed text-rhine-faint">
            当前滑块类别为 {BOARD_ACCESS_LABELS[category]}，此处创建的论坛固定归入该类别。
          </p>
          <CreateBoardForm
            access={category}
            onCreated={async (id) => {
              setNotice(`已在「${BOARD_ACCESS_LABELS[category]}」创建论坛`)
              await loadBoards()
              setSelectedId(id)
            }}
          />
        </AdminPanel>
      )}
    </div>
  )
}

function CreateBoardForm({
  access,
  onCreated,
}: {
  access: BoardAccess
  onCreated: (id: number) => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!name.trim() || !slug.trim()) return
    setBusy(true)
    setError('')
    try {
      const data = await adminApi.createBoard({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        access,
        tags: tags.split(/[,，\s]+/).filter(Boolean),
      })
      setName('')
      setSlug('')
      setDescription('')
      setTags('')
      await onCreated(data.id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label="名称 / NAME">
          <AdminInput value={name} onChange={(event) => setName(event.target.value)} />
        </AdminField>
        <AdminField label="Slug / URL">
          <AdminInput value={slug} onChange={(event) => setSlug(event.target.value)} />
        </AdminField>
        <AdminField label="标签 / TAGS">
          <AdminInput value={tags} onChange={(event) => setTags(event.target.value)} />
        </AdminField>
        <AdminField label="类别 / ACCESS">
          <AdminInput value={BOARD_ACCESS_LABELS[access]} disabled />
        </AdminField>
      </div>
      <AdminField label="描述 / DESCRIPTION">
        <AdminTextarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
      </AdminField>
      <AdminError message={error} />
      <AdminButton onClick={() => void create()} disabled={busy || !name.trim() || !slug.trim()}>
        <Plus className="h-3 w-3" /> 在「{BOARD_ACCESS_LABELS[access]}」创建
      </AdminButton>
    </div>
  )
}

function BoardDetail({
  board,
  user,
  onBack,
  notice,
  onNotice,
  error,
  setError,
  busy,
  setBusy,
}: {
  board: Board
  user: ReturnType<typeof useSession>['user']
  onBack: () => void
  notice: string
  onNotice: (value: string) => void
  error: string
  setError: (value: string) => void
  busy: boolean
  setBusy: (value: boolean) => void
}) {
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [users, setUsers] = useState<
    Array<{ id: number; username: string; nickname: string; forumTitle?: string }>
  >([])
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [titleTarget, setTitleTarget] = useState('')
  const [grantTitle, setGrantTitle] = useState('')
  const [grantLocked, setGrantLocked] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(board.name)
  const [description, setDescription] = useState(board.description)
  const [tags, setTags] = useState((board.tags ?? []).join(', '))
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      const [postData, annData, ruleData, userData] = await Promise.all([
        adminApi.boardPosts(board.id),
        forumApi.announcements(board.id),
        adminApi.forumTitleRules(board.id),
        adminApi.forumUsers(),
      ])
      setPosts(postData.posts)
      setAnnouncements(annData.announcements.filter((item) => item.boardId === board.id))
      setRules(
        ruleData.rules.map((rule) => ({
          level: Number(rule.level),
          minPoints: Number(rule.minPoints),
          title: rule.title,
        })),
      )
      setUsers(userData.users)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [board.id, setError])

  useEffect(() => {
    void load()
  }, [load])

  const publishAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return
    setBusy(true)
    try {
      await adminApi.createAnnouncement({
        boardId: board.id,
        title: annTitle.trim(),
        content: annContent.trim(),
      })
      setAnnTitle('')
      setAnnContent('')
      onNotice('板块公告已发布')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const removeAnnouncement = async (id: number) => {
    setBusy(true)
    try {
      await adminApi.removeAnnouncement(id)
      onNotice('公告已删除')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const saveRules = async () => {
    setBusy(true)
    try {
      await adminApi.saveForumTitleRules(
        rules
          .filter((rule) => rule.level > 0 && rule.title.trim())
          .map((rule) => ({
            level: Number(rule.level),
            minPoints: Number(rule.minPoints),
            title: rule.title.trim(),
          })),
        board.id,
      )
      onNotice(`「${board.name}」等级/头衔规则已保存`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const grantMemberTitle = async () => {
    if (!titleTarget) return
    setBusy(true)
    try {
      await adminApi.grantBoardTitle(board.id, Number(titleTarget), grantTitle.trim(), grantLocked)
      onNotice(grantTitle.trim() ? '论坛头衔已发放' : '已恢复该论坛自动头衔')
      setGrantTitle('')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const saveBoard = async () => {
    setBusy(true)
    try {
      await adminApi.updateBoard(board.id, {
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(/[,，\s]+/).filter(Boolean),
      })
      setEditing(false)
      onNotice('论坛信息已更新')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const moderate = async (id: number, action: 'pin' | 'unpin' | 'hide' | 'restore' | 'delete') => {
    setBusy(true)
    try {
      await adminApi.moderatePost(id, action)
      onNotice('帖子状态已更新')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const replies = posts.reduce((sum, post) => sum + post.replyCount, 0)
  const filteredUsers = users.filter((item) => {
    const keyword = query.trim().toLowerCase()
    return (
      !keyword ||
      item.username.toLowerCase().includes(keyword) ||
      item.nickname.toLowerCase().includes(keyword)
    )
  })

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel
        title={`${board.name} · ${BOARD_ACCESS_LABELS[board.access]}`}
        subtitle="BOARD CONTROL"
        actions={
          <AdminButton variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-3 w-3" /> 返回类别
          </AdminButton>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">帖子</p>
            <p className="text-xl text-rhine-gold">{posts.length}</p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">回复</p>
            <p className="text-xl text-rhine-cyan">{replies}</p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">待审</p>
            <p className="text-xl text-rhine-red">{board.pendingCount ?? 0}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            to={`/forum/${board.slug}`}
            className="inline-flex items-center gap-1 border border-rhine-line px-2 py-1.5 font-mono text-[10px] text-rhine-dim hover:text-rhine-gold"
          >
            <MessageSquare className="h-3 w-3" /> 打开论坛
          </Link>
          {(user?.isSuper || user?.permissions.includes('forum')) && (
            <AdminButton variant="ghost" onClick={() => setEditing((value) => !value)}>
              <Pencil className="h-3 w-3" /> 编辑论坛
            </AdminButton>
          )}
        </div>
        {editing && (
          <div className="mt-3 space-y-2 border border-rhine-line/50 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <AdminField label="名称">
                <AdminInput value={name} onChange={(event) => setName(event.target.value)} />
              </AdminField>
              <AdminField label="标签">
                <AdminInput value={tags} onChange={(event) => setTags(event.target.value)} />
              </AdminField>
            </div>
            <AdminField label="描述">
              <AdminTextarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
            </AdminField>
            <div className="flex gap-2">
              <AdminButton onClick={() => void saveBoard()} disabled={busy}>保存</AdminButton>
              <AdminButton variant="ghost" onClick={() => setEditing(false)}>取消</AdminButton>
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="板块公告" subtitle="ANNOUNCEMENTS">
        <div className="space-y-2">
          <AdminInput value={annTitle} onChange={(event) => setAnnTitle(event.target.value)} placeholder="公告标题" />
          <AdminTextarea value={annContent} onChange={(event) => setAnnContent(event.target.value)} rows={2} placeholder="公告内容" />
          <AdminButton onClick={() => void publishAnnouncement()} disabled={busy}>
            <Megaphone className="h-3 w-3" /> 发布公告
          </AdminButton>
        </div>
        <ul className="mt-3 divide-y divide-rhine-line/40 border-t border-rhine-line/40">
          {announcements.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-rhine-ink">{item.title}</span>
              <AdminButton variant="danger" onClick={() => void removeAnnouncement(item.id)}>
                <Trash2 className="h-3 w-3" /> 删除
              </AdminButton>
            </li>
          ))}
          {announcements.length === 0 && <li className="py-2 text-xs text-rhine-faint">暂无公告</li>}
        </ul>
      </AdminPanel>

      <AdminPanel title="等级与头衔" subtitle="LEVELS & TITLES">
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="grid gap-2 border border-rhine-line/50 p-2 sm:grid-cols-[90px_120px_1fr_40px]">
              <AdminField label="等级">
                <AdminInput
                  type="number"
                  value={rule.level}
                  onChange={(event) =>
                    setRules((current) =>
                      current.map((item, i) => (i === index ? { ...item, level: Number(event.target.value) } : item)),
                    )
                  }
                />
              </AdminField>
              <AdminField label="最低积分">
                <AdminInput
                  type="number"
                  value={rule.minPoints}
                  onChange={(event) =>
                    setRules((current) =>
                      current.map((item, i) => (i === index ? { ...item, minPoints: Number(event.target.value) } : item)),
                    )
                  }
                />
              </AdminField>
              <AdminField label="头衔">
                <AdminInput
                  value={rule.title}
                  onChange={(event) =>
                    setRules((current) =>
                      current.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                    )
                  }
                />
              </AdminField>
              <button
                type="button"
                onClick={() => setRules((current) => current.filter((_, i) => i !== index))}
                className="mt-4 flex h-9 items-center justify-center border border-rhine-line text-rhine-faint hover:text-rhine-red"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <AdminButton
            variant="ghost"
            onClick={() => setRules((current) => [...current, { level: current.length + 1, minPoints: 0, title: '' }])}
          >
            <Plus className="h-3 w-3" /> 添加等级
          </AdminButton>
          <AdminButton onClick={() => void saveRules()} disabled={busy}>保存规则</AdminButton>
        </div>

        <div className="mt-4 grid gap-2 border-t border-rhine-line/40 pt-3 sm:grid-cols-2">
          <AdminField label="成员搜索">
            <AdminInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索成员" />
          </AdminField>
          <AdminField label="成员">
            <select
              value={titleTarget}
              onChange={(event) => setTitleTarget(event.target.value)}
              className="h-9 w-full border border-rhine-line bg-rhine-abyss/70 px-2 font-mono text-xs text-rhine-ink"
            >
              <option value="">选择成员</option>
              {filteredUsers.slice(0, 100).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nickname} · {item.forumTitle || '自动'}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="头衔（留空恢复自动）">
            <AdminInput value={grantTitle} onChange={(event) => setGrantTitle(event.target.value)} />
          </AdminField>
          <label className="flex items-end gap-2 pb-2 font-mono text-[10px] text-rhine-dim">
            <input type="checkbox" checked={grantLocked} onChange={(event) => setGrantLocked(event.target.checked)} />
            锁定
          </label>
          <div className="sm:col-span-2">
            <AdminButton onClick={() => void grantMemberTitle()} disabled={busy || !titleTarget}>
              发放本论坛头衔
            </AdminButton>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="帖子管理" subtitle="THREADS">
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="border border-rhine-line/60 bg-rhine-abyss/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] text-rhine-gold">{post.status}{post.pinned ? ' · PIN' : ''}</span>
                <span className="font-mono text-[9px] text-rhine-faint">{post.author}</span>
              </div>
              <h3 className="mt-1 text-sm text-rhine-ink">{post.title}</h3>
              <p className="mt-1 font-mono text-[9px] text-rhine-faint">{post.replyCount} 条回复</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <AdminButton variant="ghost" onClick={() => void moderate(post.id, post.pinned ? 'unpin' : 'pin')}>
                  {post.pinned ? '取消置顶' : '置顶'}
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  onClick={() => void moderate(post.id, post.status === 'hidden' ? 'restore' : 'hide')}
                >
                  {post.status === 'hidden' ? '恢复' : '隐藏'}
                </AdminButton>
                <AdminButton variant="danger" onClick={() => void moderate(post.id, 'delete')}>
                  删除
                </AdminButton>
              </div>
            </article>
          ))}
          {posts.length === 0 && <p className="text-xs text-rhine-faint">暂无帖子</p>}
        </div>
      </AdminPanel>
    </div>
  )
}
