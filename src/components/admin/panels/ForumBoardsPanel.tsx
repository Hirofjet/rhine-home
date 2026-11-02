import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  forumApi,
  hasPerm,
  type Announcement,
  type ApiUser,
  type Board,
} from '../../../lib/api'
import {
  AdminBadge,
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminModal,
  AdminNotice,
  AdminPanel,
  AdminTextarea,
} from '../AdminUi'

interface BoardForm {
  name: string
  slug: string
  description: string
  access: 'public' | 'special' | 'core'
  sort: string
}

const emptyForm: BoardForm = {
  name: '',
  slug: '',
  description: '',
  access: 'public',
  sort: '0',
}

const ACCESS_LABEL: Record<string, string> = {
  public: '公开',
  special: '特殊',
  core: '核心',
}

/** 论坛板块管理（创建 / 编辑 / 删除） */
export function ForumBoardsPanel({ user }: { user: ApiUser }) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Board | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BoardForm>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [annBoardId, setAnnBoardId] = useState('')
  const [moderators, setModerators] = useState<
    Array<{
      id: number
      boardId: number
      boardName: string
      access: string
      username: string
      role: 'master' | 'admin'
    }>
  >([])
  const [allUsers, setAllUsers] = useState<ApiUser[]>([])
  const [modBoard, setModBoard] = useState('')
  const [modUser, setModUser] = useState('')
  const [modRole, setModRole] = useState<'master' | 'admin'>('admin')
  const [inviteBoard, setInviteBoard] = useState('')
  const [inviteUser, setInviteUser] = useState('')
  const [modQuery, setModQuery] = useState('')
  const [modAccess, setModAccess] = useState('all')
  const [deletions, setDeletions] = useState<
    Array<{
      id: number
      boardName: string
      requester: string
      status: string
      approvals: number
      canVote: boolean
    }>
  >([])
  const [requests, setRequests] = useState<
    Array<{
      id: number
      boardName: string
      username: string
      status: string
      createdAt: string
    }>
  >([])

  const canManageAll = user.isSuper || hasPerm(user, 'forum')
  const canCreateBoard =
    canManageAll ||
    ['senior', 'forum_master', 'core_master', 'special_master', 'normal_master'].includes(
      user.identity ?? '',
    )

  const load = useCallback(async () => {
    try {
      const [data, annData, requestData, modData, userData, deletionData] = await Promise.all([
        adminApi.forumBoards(),
        forumApi.announcements(),
        adminApi.requests(),
        adminApi.forumModerators(),
        canManageAll ? adminApi.users().catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
        adminApi.deletionRequests().catch(() => ({ requests: [] })),
      ])
      setBoards(data.boards)
      setAnnouncements(annData.announcements)
      setRequests(requestData.requests)
      setModerators(modData.moderators)
      setAllUsers(userData.users)
      setDeletions(deletionData.requests)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [canManageAll])

  const assignModerator = async () => {
    if (!modBoard || !modUser) {
      setError('请选择板块和成员')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.assignModerator({
        boardId: Number(modBoard),
        userId: Number(modUser),
        role: modRole,
      })
      setNotice('板块管理员已授权')
      setModBoard('')
      setModUser('')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const removeModerator = async (id: number) => {
    try {
      await adminApi.removeModerator(id)
      setNotice('板块管理员已移除')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const inviteCore = async () => {
    if (!inviteBoard || !inviteUser) {
      setError('请选择核心板块和成员')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.inviteToBoard(Number(inviteBoard), Number(inviteUser))
      setNotice('核心论坛邀请已发送')
      setInviteBoard('')
      setInviteUser('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const reviewRequest = async (id: number, approve: boolean) => {    try {
      await adminApi.reviewRequest(id, approve)
      setNotice(approve ? '已通过访问申请' : '已拒绝访问申请')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const removeAnnouncement = async (id: number) => {
    try {
      await adminApi.removeAnnouncement(id)
      setNotice('公告已删除')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const publishAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) {
      setError('公告标题和内容不能为空')
      return
    }
    setBusy(true)
    try {
      await adminApi.createAnnouncement({
        boardId: annBoardId ? Number(annBoardId) : null,
        title: annTitle.trim(),
        content: annContent.trim(),
      })
      setAnnTitle('')
      setAnnContent('')
      setAnnBoardId('')
      setNotice('公告已发布')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let alive = true
    adminApi
      .forumBoards()
      .then((data) => {
        if (!alive) return
        setBoards(data.boards)
        setError('')
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (board: Board) => {
    setEditing(board)
    setForm({
      name: board.name,
      slug: board.slug,
      description: board.description,
      access: board.access ?? 'public',
      sort: String(board.sort),
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('名称与 slug 必填')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim(),
        access: form.access,
        sort: Number(form.sort) || 0,
      }
      if (editing) await adminApi.updateBoard(editing.id, payload)
      else await adminApi.createBoard(payload)
      setNotice(editing ? '板块已更新' : '板块已创建')
      setOpen(false)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const voteDeletion = async (id: number, approve: boolean) => {
    try {
      await adminApi.voteDeletion(id, approve)
      setNotice(approve ? '已同意删除申请' : '已否决删除申请')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.requestBoardDeletion(deleteTarget.id)
      setNotice('删除申请已提交，等待高级管理员审批（0/3）')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="论坛板块"
        subtitle="FORUM BOARDS"
        actions={
          <>
            <AdminButton variant="ghost" onClick={() => void load()}>
              <RefreshCw className="h-3 w-3" /> 刷新
            </AdminButton>
            {canCreateBoard && (
              <AdminButton onClick={openCreate}>
                <Plus className="h-3 w-3" /> 新建板块
              </AdminButton>
            )}
          </>
        }
      >
        {!canManageAll && (
          <p className="mb-3 border border-rhine-gold/30 bg-rhine-gold/5 px-3 py-2 font-mono text-[10px] tracking-wider text-rhine-gold">
            当前账号只能管理已授权的板块内容，不能创建 / 删除板块。
          </p>
        )}

        {canManageAll && (
          <div className="mb-4 space-y-2 border border-rhine-line/60 bg-rhine-abyss/30 p-3">
            <p className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">发布公告</p>
            <select
              value={annBoardId}
              onChange={(event) => setAnnBoardId(event.target.value)}
              className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
            >
              <option value="">全站公告</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} · 板块公告
                </option>
              ))}
            </select>
            <AdminInput
              value={annTitle}
              onChange={(event) => setAnnTitle(event.target.value)}
              placeholder="公告标题"
            />
            <AdminTextarea
              value={annContent}
              onChange={(event) => setAnnContent(event.target.value)}
              placeholder="公告内容"
              className="min-h-16"
            />
            <div className="flex justify-end">
              <AdminButton onClick={() => void publishAnnouncement()} disabled={busy}>
                {busy ? '发布中…' : '发布公告'}
              </AdminButton>
            </div>
            {announcements.length > 0 && (
              <ul className="divide-y divide-rhine-line/50">
                {announcements.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs text-rhine-ink">
                      {item.title}
                    </span>
                    <AdminButton variant="danger" onClick={() => void removeAnnouncement(item.id)}>
                      删除
                    </AdminButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {loading ? (
          <p className="font-mono text-[10px] tracking-wider text-rhine-faint">加载中…</p>
        ) : (
          <ul className="divide-y divide-rhine-line/60">
            {boards.map((board) => (
              <li key={board.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-rhine-ink">{board.name}</p>
                    <AdminBadge>{board.slug}</AdminBadge>
                    <AdminBadge
                      tone={
                        board.access === 'core'
                          ? 'gold'
                          : board.access === 'special'
                            ? 'cyan'
                            : 'line'
                      }
                    >
                      {ACCESS_LABEL[board.access] ?? '公开'}
                    </AdminBadge>
                    {board.pendingCount ? (
                      <AdminBadge tone="gold">{board.pendingCount} 待审</AdminBadge>
                    ) : null}
                    {!board.canModerate && !user.isSuper ? (
                      <AdminBadge tone="red">无审核权限</AdminBadge>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[10px] tracking-wider text-rhine-faint">
                    {board.description || '暂无描述'} · {board.postCount} 帖
                  </p>
                </div>
                {canManageAll && (
                  <div className="flex gap-2">
                    <AdminButton variant="ghost" onClick={() => openEdit(board)}>
                      编辑
                    </AdminButton>
                    <AdminButton variant="danger" onClick={() => setDeleteTarget(board)}>
                      <Trash2 className="h-3 w-3" /> 删除
                    </AdminButton>
                  </div>
                )}
              </li>
            ))}
            {boards.length === 0 && (
              <li className="py-4 font-mono text-[10px] tracking-wider text-rhine-faint">
                还没有板块。
              </li>
            )}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="访问申请" subtitle="ACCESS REQUESTS">
        {requests.length === 0 ? (
          <p className="font-mono text-[10px] tracking-wider text-rhine-faint">
            暂无访问申请。
          </p>
        ) : (
          <ul className="divide-y divide-rhine-line/60">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="text-xs text-rhine-ink">{request.username}</span>
                <span className="font-mono text-[10px] text-rhine-dim">
                  申请访问「{request.boardName}」
                </span>
                <AdminBadge
                  tone={
                    request.status === 'approved'
                      ? 'green'
                      : request.status === 'rejected'
                        ? 'red'
                        : 'gold'
                  }
                >
                  {request.status === 'approved'
                    ? '已通过'
                    : request.status === 'rejected'
                      ? '已拒绝'
                      : '待审核'}
                </AdminBadge>
                {request.status === 'pending' && (
                  <span className="ml-auto flex gap-2">
                    <AdminButton
                      variant="ghost"
                      onClick={() => void reviewRequest(request.id, true)}
                    >
                      通过
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      onClick={() => void reviewRequest(request.id, false)}
                    >
                      拒绝
                    </AdminButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="删除申请" subtitle="DELETION REVIEW">
        {deletions.length === 0 ? (
          <p className="font-mono text-[10px] text-rhine-faint">暂无删除申请</p>
        ) : (
          <ul className="divide-y divide-rhine-line/60">
            {deletions.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="text-xs text-rhine-ink">{item.boardName}</span>
                <span className="font-mono text-[10px] text-rhine-dim">申请人：{item.requester}</span>
                <AdminBadge
                  tone={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'gold'}
                >
                  {item.status === 'approved'
                    ? '已通过'
                    : item.status === 'rejected'
                      ? '已否决'
                      : `${item.approvals}/3`}
                </AdminBadge>
                {item.status === 'pending' && item.canVote && (
                  <span className="ml-auto flex gap-2">
                    <AdminButton variant="ghost" onClick={() => void voteDeletion(item.id, true)}>
                      同意
                    </AdminButton>
                    <AdminButton variant="danger" onClick={() => void voteDeletion(item.id, false)}>
                      否决
                    </AdminButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="板块管理员" subtitle="BOARD MODERATORS">
        <div className="mb-3 flex flex-wrap gap-2">
          <AdminInput
            value={modQuery}
            onChange={(event) => setModQuery(event.target.value)}
            placeholder="搜索板块或成员"
            className="max-w-56"
          />
          <select
            value={modAccess}
            onChange={(event) => setModAccess(event.target.value)}
            className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[11px] text-rhine-ink"
          >
            <option value="all">全部类别</option>
            <option value="public">公开</option>
            <option value="special">特殊</option>
            <option value="core">核心</option>
          </select>
        </div>
        {canManageAll && (
          <div className="mb-4 grid gap-2 border border-rhine-line/60 bg-rhine-abyss/30 p-3 sm:grid-cols-4">
            <select value={modBoard} onChange={(e) => setModBoard(e.target.value)} className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[11px] text-rhine-ink">
              <option value="">选择板块</option>
              {boards
                .filter((board) => modAccess === 'all' || board.access === modAccess)
                .filter((board) => !modQuery.trim() || board.name.toLowerCase().includes(modQuery.trim().toLowerCase()))
                .map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
            </select>
            <select value={modUser} onChange={(e) => setModUser(e.target.value)} className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[11px] text-rhine-ink">
              <option value="">选择成员</option>
              {allUsers
                .filter((member) => !modQuery.trim() || member.username.toLowerCase().includes(modQuery.trim().toLowerCase()))
                .map((member) => <option key={member.id} value={member.id}>{member.username}</option>)}
            </select>
            <select value={modRole} onChange={(e) => setModRole(e.target.value as 'master' | 'admin')} className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[11px] text-rhine-ink">
              <option value="admin">子管理员</option>
              <option value="master">总管理员</option>
            </select>
            <AdminButton onClick={() => void assignModerator()} disabled={busy}>授权</AdminButton>
          </div>
        )}
        {canManageAll && (
          <div className="mb-4 grid gap-2 border border-rhine-gold/30 bg-rhine-gold/[0.03] p-3 sm:grid-cols-3">
            <select value={inviteBoard} onChange={(e) => setInviteBoard(e.target.value)} className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[11px] text-rhine-ink">
              <option value="">核心板块邀请</option>
              {boards.filter((board) => board.access === 'core').map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
            </select>
            <select value={inviteUser} onChange={(e) => setInviteUser(e.target.value)} className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[11px] text-rhine-ink">
              <option value="">选择成员</option>
              {allUsers.map((member) => <option key={member.id} value={member.id}>{member.username}</option>)}
            </select>
            <AdminButton variant="ghost" onClick={() => void inviteCore()} disabled={busy}>发送邀请</AdminButton>
          </div>
        )}
        {moderators.length === 0 ? (
          <p className="font-mono text-[10px] text-rhine-faint">暂无板块管理员</p>
        ) : (
          <ul className="divide-y divide-rhine-line/60">
            {moderators
              .filter((item) => modAccess === 'all' || item.access === modAccess)
              .filter(
                (item) =>
                  !modQuery.trim() ||
                  item.boardName.toLowerCase().includes(modQuery.trim().toLowerCase()) ||
                  item.username.toLowerCase().includes(modQuery.trim().toLowerCase()),
              )
              .map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-2">
                <span className="text-xs text-rhine-ink">{item.username}</span>
                <span className="font-mono text-[10px] text-rhine-dim">{item.boardName}</span>
                <AdminBadge tone={item.role === 'master' ? 'gold' : 'cyan'}>
                  {item.role === 'master' ? '总管理员' : '管理员'}
                </AdminBadge>
                {canManageAll && (
                  <AdminButton variant="danger" className="ml-auto" onClick={() => void removeModerator(item.id)}>
                    移除
                  </AdminButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? '编辑板块' : '新建板块'}
        subtitle="FORUM BOARD"
      >
        <div className="space-y-3">
          <AdminField label="名称 / NAME">
            <AdminInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="综合讨论"
            />
          </AdminField>
          <AdminField label="Slug / URL" hint="小写字母、数字、短横线">
            <AdminInput
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="general"
            />
          </AdminField>
          <AdminField label="描述 / DESCRIPTION">
            <AdminTextarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="min-h-20"
            />
          </AdminField>
          <AdminField label="板块类别 / ACCESS">
            <select
              value={form.access}
              onChange={(event) =>
                setForm({
                  ...form,
                  access: event.target.value as BoardForm['access'],
                })
              }
              className="w-full border border-rhine-line bg-rhine-abyss/60 px-2.5 py-1.5 font-mono text-[11px] text-rhine-ink outline-none"
            >
              <option value="public">公开（所有人，包括游客）</option>
              <option value="special">特殊（需申请 / 授权）</option>
              <option value="core">核心（仅超级管理员与授权成员）</option>
            </select>
          </AdminField>
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setOpen(false)}>
              取消
            </AdminButton>
            <AdminButton onClick={() => void save()} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="删除板块"
        subtitle="DANGER"
      >
        <p className="font-mono text-[11px] leading-relaxed tracking-wider text-rhine-dim">
          提交删除「{deleteTarget?.name}」申请。需要至少 3 名高级管理员同意；超级管理员与高级管理员可一票否决。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={() => setDeleteTarget(null)}>
            取消
          </AdminButton>
          <AdminButton variant="danger" onClick={() => void remove()}>
            提交删除申请
          </AdminButton>
        </div>
      </AdminModal>
    </div>
  )
}
