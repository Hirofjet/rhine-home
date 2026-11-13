/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Megaphone,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
  special: '特殊论坛',
  core: '核心论坛',
}

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
    board.canModerate === true
  )
}

export function ForumMaintenancePanel() {
  const { user } = useSession()
  const [boards, setBoards] = useState<Board[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [forumUsers, setForumUsers] = useState<
    Array<{ id: number; username: string; nickname: string; forumTitle?: string }>
  >([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [titleTarget, setTitleTarget] = useState('')
  const [grantTitle, setGrantTitle] = useState('')
  const [grantLocked, setGrantLocked] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState('')
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTags, setNewTags] = useState('')

  const manageable = useMemo(
    () => boards.filter((board) => canManageBoard(user, board)),
    [boards, user],
  )
  const selected = manageable.find((board) => board.id === selectedId) ?? manageable[0] ?? null
  const filtered = manageable.filter((board) => {
    const keyword = query.trim().toLowerCase()
    return (
      !keyword ||
      board.name.toLowerCase().includes(keyword) ||
      board.slug.toLowerCase().includes(keyword)
    )
  })

  const loadBoards = useCallback(async () => {
    try {
      const data = await adminApi.forumBoards()
      setBoards(data.boards)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  const loadBoard = useCallback(async (board: Board) => {
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
      setForumUsers(userData.users)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void loadBoards()
  }, [loadBoards])
  useEffect(() => {
    if (selected) void loadBoard(selected)
  }, [selected, loadBoard])
  useEffect(() => {
    if (!selectedId && manageable.length) setSelectedId(manageable[0].id)
  }, [manageable, selectedId])

  const totals = useMemo(
    () => ({
      forums: manageable.length,
      posts: manageable.reduce((sum, board) => sum + board.postCount, 0),
      replies: manageable.reduce((sum, board) => sum + (board.replyCount ?? 0), 0),
      pending: manageable.reduce((sum, board) => sum + (board.pendingCount ?? 0), 0),
      active: manageable.reduce((sum, board) => sum + (board.activeUsers ?? 0), 0),
    }),
    [manageable],
  )

  const refresh = async () => {
    await loadBoards()
    if (selected) await loadBoard(selected)
  }

  const publishAnnouncement = async () => {
    if (!selected || !annTitle.trim() || !annContent.trim()) return
    setBusy(true)
    try {
      await adminApi.createAnnouncement({
        boardId: selected.id,
        title: annTitle.trim(),
        content: annContent.trim(),
      })
      setAnnTitle('')
      setAnnContent('')
      setNotice('板块公告已发布')
      await loadBoard(selected)
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
      setNotice('公告已删除')
      if (selected) await loadBoard(selected)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const saveRules = async () => {
    if (!selected) return
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
        selected.id,
      )
      setNotice(`「${selected.name}」等级头衔规则已保存`)
      await loadBoard(selected)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const grantMemberTitle = async () => {
    if (!selected || !titleTarget) return
    setBusy(true)
    try {
      await adminApi.grantBoardTitle(
        selected.id,
        Number(titleTarget),
        grantTitle.trim(),
        grantLocked,
      )
      setNotice(grantTitle.trim() ? '论坛头衔已发放' : '已恢复该论坛自动头衔')
      setGrantTitle('')
      await loadBoard(selected)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const createBoard = async () => {
    if (!selected || !newName.trim() || !newSlug.trim()) return
    setBusy(true)
    try {
      const data = await adminApi.createBoard({
        name: newName.trim(),
        slug: newSlug.trim().toLowerCase(),
        description: newDescription.trim(),
        access: selected.access,
        tags: newTags.split(/[,，\s]+/).filter(Boolean),
      })
      setNewName('')
      setNewSlug('')
      setNewDescription('')
      setNewTags('')
      setNotice(`已在「${BOARD_ACCESS_LABELS[selected.access]}」类别创建论坛`)
      await loadBoards()
      setSelectedId(data.id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const openEdit = () => {
    if (!selected) return
    setEditName(selected.name)
    setEditDescription(selected.description)
    setEditTags((selected.tags ?? []).join(', '))
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!selected) return
    setBusy(true)
    try {
      await adminApi.updateBoard(selected.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        tags: editTags.split(/[,，\s]+/).filter(Boolean),
      })
      setEditOpen(false)
      setNotice('论坛信息已更新')
      await loadBoards()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const bars = selected
    ? [
        ['帖子', selected.postCount, 'bg-rhine-gold'],
        ['回复', selected.replyCount ?? 0, 'bg-rhine-cyan'],
        ['待审', selected.pendingCount ?? 0, 'bg-rhine-red'],
        ['活跃用户', selected.activeUsers ?? 0, 'bg-rhine-green'],
      ]
    : []
  const maxBar = Math.max(1, ...bars.map(([, value]) => Number(value)))

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="论坛创建与维护"
        subtitle="FORUM MAINTENANCE"
        actions={
          <AdminButton variant="ghost" onClick={() => void refresh()} disabled={busy}>
            <RefreshCw className="h-3 w-3" /> 刷新
          </AdminButton>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            ['论坛数量', totals.forums, 'text-rhine-gold'],
            ['帖子总数', totals.posts, 'text-rhine-cyan'],
            ['回复总数', totals.replies, 'text-rhine-green'],
            ['待审内容', totals.pending, 'text-rhine-red'],
            ['活跃用户', totals.active, 'text-rhine-gold'],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="border border-rhine-line/60 p-3">
              <p className="font-mono text-[9px] text-rhine-faint">{label}</p>
              <p className={`mt-1 text-xl ${color}`}>{Number(value).toLocaleString('zh-CN')}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border border-rhine-line/60 bg-rhine-abyss/30 px-2 py-1.5">
          <Search className="h-3 w-3 text-rhine-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索论坛名或 slug"
            className="w-full bg-transparent font-mono text-[10px] text-rhine-ink outline-none"
          />
          <span className="shrink-0 font-mono text-[9px] text-rhine-faint">
            {filtered.length}/{manageable.length}
          </span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {filtered.map((board) => {
            const active = board.id === selected?.id
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedId(board.id)}
                className={`min-w-36 shrink-0 border p-2 text-left transition-colors ${
                  active
                    ? 'border-rhine-gold bg-rhine-gold/10'
                    : 'border-rhine-line/60 bg-rhine-panel/30 hover:border-rhine-gold/50'
                }`}
              >
                <span className="font-mono text-[8px] tracking-wider text-rhine-faint">
                  {BOARD_ACCESS_LABELS[board.access]}
                </span>
                <span className="mt-1 block truncate text-xs text-rhine-ink">{board.name}</span>
                <span className="mt-1 block font-mono text-[9px] text-rhine-dim">
                  {board.postCount} 帖 · {board.replyCount ?? 0} 回 · {board.activeUsers ?? 0} 人
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="py-3 text-xs text-rhine-faint">没有可管理的论坛</p>
          )}
        </div>

        {selected ? (
          <div className="mt-3 border border-rhine-line/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] text-rhine-gold">
                  {BOARD_ACCESS_LABELS[selected.access]} · #{selected.id}
                </p>
                <h3 className="mt-1 text-lg text-rhine-ink">{selected.name}</h3>
                <p className="mt-1 text-xs text-rhine-dim">{selected.description || '暂无描述'}</p>
              </div>
              {(user?.isSuper || user?.permissions.includes('forum')) && (
                <AdminButton variant="ghost" onClick={openEdit}>
                  <Pencil className="h-3 w-3" /> 编辑论坛
                </AdminButton>
              )}
            </div>

            <div className="mt-4 flex h-26 items-end gap-4 border border-rhine-line/40 p-3">
              {bars.map(([label, value, color]) => (
                <div key={String(label)} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span
                    className={`w-full ${color}`}
                    style={{ height: `${Math.max(8, (Number(value) / maxBar) * 70)}px` }}
                  />
                  <span className="font-mono text-[8px] text-rhine-faint">{label}</span>
                  <span className="font-mono text-[9px] text-rhine-dim">{value}</span>
                </div>
              ))}
            </div>

            {editOpen && (
              <div className="mt-3 space-y-2 border border-rhine-line/50 bg-rhine-abyss/30 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <AdminField label="名称">
                    <AdminInput value={editName} onChange={(event) => setEditName(event.target.value)} />
                  </AdminField>
                  <AdminField label="标签">
                    <AdminInput value={editTags} onChange={(event) => setEditTags(event.target.value)} />
                  </AdminField>
                </div>
                <AdminField label="描述">
                  <AdminTextarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    rows={2}
                  />
                </AdminField>
                <div className="flex gap-2">
                  <AdminButton onClick={() => void saveEdit()} disabled={busy}>保存</AdminButton>
                  <AdminButton variant="ghost" onClick={() => setEditOpen(false)}>取消</AdminButton>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 border border-dashed border-rhine-line/60 p-6 text-center text-xs text-rhine-faint">
            你没有任何论坛的管理权限，因此无法切换论坛。
          </p>
        )}
      </AdminPanel>

      {selected && (
        <>
          <AdminPanel title={`${selected.name} · 创建论坛`} subtitle="CREATE IN THIS CATEGORY">
            <p className="mb-3 font-mono text-[9px] leading-relaxed text-rhine-faint">
              当前滑块对应类别：{BOARD_ACCESS_LABELS[selected.access]}。
              此处创建的论坛会自动归入该类别，不能通过表单改成其他类别。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="名称 / NAME">
                <AdminInput value={newName} onChange={(event) => setNewName(event.target.value)} />
              </AdminField>
              <AdminField label="Slug / URL">
                <AdminInput value={newSlug} onChange={(event) => setNewSlug(event.target.value)} />
              </AdminField>
              <AdminField label="标签 / TAGS">
                <AdminInput value={newTags} onChange={(event) => setNewTags(event.target.value)} />
              </AdminField>
              <AdminField label="类别 / ACCESS">
                <AdminInput value={BOARD_ACCESS_LABELS[selected.access]} disabled />
              </AdminField>
            </div>
            <AdminField label="描述 / DESCRIPTION">
              <AdminTextarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                rows={2}
              />
            </AdminField>
            <AdminButton onClick={() => void createBoard()} disabled={busy || !newName || !newSlug}>
              <Plus className="h-3 w-3" /> 在「{BOARD_ACCESS_LABELS[selected.access]}」创建
            </AdminButton>
          </AdminPanel>

          <AdminPanel title={`${selected.name} · 板块公告`} subtitle="ANNOUNCEMENTS">
            <div className="space-y-2">
              <AdminInput
                value={annTitle}
                onChange={(event) => setAnnTitle(event.target.value)}
                placeholder="公告标题"
              />
              <AdminTextarea
                value={annContent}
                onChange={(event) => setAnnContent(event.target.value)}
                rows={2}
                placeholder="公告内容"
              />
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
              {announcements.length === 0 && (
                <li className="py-2 text-xs text-rhine-faint">暂无公告</li>
              )}
            </ul>
          </AdminPanel>

          <AdminPanel title={`${selected.name} · 等级与头衔`} subtitle="LEVELS & TITLES">
            <p className="mb-3 font-mono text-[9px] text-rhine-faint">
              每个论坛独立配置等级/头衔规则，不再使用全局头衔等级面板。
            </p>
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <div key={index} className="grid gap-2 border border-rhine-line/50 p-2 sm:grid-cols-[90px_120px_1fr_40px]">
                  <AdminField label="等级">
                    <AdminInput
                      type="number"
                      value={rule.level}
                      onChange={(event) =>
                        setRules((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, level: Number(event.target.value) } : item,
                          ),
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
                          current.map((item, i) =>
                            i === index ? { ...item, minPoints: Number(event.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </AdminField>
                  <AdminField label="头衔">
                    <AdminInput
                      value={rule.title}
                      onChange={(event) =>
                        setRules((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, title: event.target.value } : item,
                          ),
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
                onClick={() =>
                  setRules((current) => [
                    ...current,
                    { level: current.length + 1, minPoints: 0, title: '' },
                  ])
                }
              >
                <Plus className="h-3 w-3" /> 添加等级
              </AdminButton>
              <AdminButton onClick={() => void saveRules()} disabled={busy}>保存规则</AdminButton>
            </div>

            <div className="mt-4 grid gap-2 border-t border-rhine-line/40 pt-3 sm:grid-cols-[1fr_1fr_auto]">
              <AdminField label="成员">
                <select
                  value={titleTarget}
                  onChange={(event) => setTitleTarget(event.target.value)}
                  className="h-9 w-full border border-rhine-line bg-rhine-abyss/70 px-2 font-mono text-xs text-rhine-ink"
                >
                  <option value="">选择成员</option>
                  {forumUsers
                    .filter((item) =>
                      !titleTarget ||
                      item.username.includes(titleTarget) ||
                      item.nickname.includes(titleTarget),
                    )
                    .map((item) => (
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
              <div className="sm:col-span-3">
                <AdminButton onClick={() => void grantMemberTitle()} disabled={busy || !titleTarget}>
                  发放本论坛头衔
                </AdminButton>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title={`${selected.name} · 帖子`}
            subtitle="THREADS"
            actions={
              <Link
                to={`/forum/${selected.slug}`}
                className="inline-flex items-center gap-1 border border-rhine-line px-2 py-1 font-mono text-[9px] text-rhine-dim hover:text-rhine-gold"
              >
                <MessageSquare className="h-3 w-3" /> 打开论坛
              </Link>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {posts.slice(0, 12).map((post) => (
                <article key={post.id} className="border border-rhine-line/50 bg-rhine-abyss/30 p-2">
                  <div className="flex items-center justify-between gap-2 font-mono text-[8px] text-rhine-faint">
                    <span>{post.status}{post.pinned ? ' · PIN' : ''}</span>
                    <span>{post.author}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-rhine-ink">{post.title}</p>
                  <p className="mt-1 font-mono text-[9px] text-rhine-faint">
                    {post.replyCount} 条回复
                  </p>
                </article>
              ))}
              {posts.length === 0 && <p className="text-xs text-rhine-faint">暂无帖子</p>}
            </div>
          </AdminPanel>
        </>
      )}
    </div>
  )
}
