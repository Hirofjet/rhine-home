import { useCallback, useEffect, useState } from 'react'
import { Ban, KeyRound, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  forumApi,
  ROLE_LABELS,
  type ApiUser,
  type Board,
} from '../../../lib/api'
import {
  AdminBadge,
  AdminButton,
  AdminCheckbox,
  AdminError,
  AdminField,
  AdminInput,
  AdminModal,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'
import { PermissionTree } from '../PermissionTree'

type ModalState =
  | { type: 'add' }
  | { type: 'permissions'; target: ApiUser }
  | { type: 'password'; target: ApiUser }
  | { type: 'delete'; target: ApiUser }
  | null

interface MembersPanelProps {
  user: ApiUser
}

export function MembersPanel({ user }: MembersPanelProps) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [busy, setBusy] = useState(false)

  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPermissions, setNewPermissions] = useState<string[]>([])

  const [draftPermissions, setDraftPermissions] = useState<string[]>([])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [banTarget, setBanTarget] = useState<ApiUser | null>(null)
  const [banDays, setBanDays] = useState('7')
  const [banPermanent, setBanPermanent] = useState(false)
  const [banReason, setBanReason] = useState('')

  const actorCanManage =
    user.isSuper || user.permissions.includes('members.manage')
  const actorCanGrant =
    user.isSuper || user.permissions.includes('members.grant')

  const load = useCallback(async () => {
    const [usersData, boardsData] = await Promise.all([
      adminApi.users(),
      forumApi.boards(),
    ])
    setUsers(usersData.users)
    setBoards(boardsData.boards)
    setError('')
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([adminApi.users(), forumApi.boards()])
      .then(([usersData, boardsData]) => {
        if (!alive) return
        setUsers(usersData.users)
        setBoards(boardsData.boards)
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

  const targetHasManagement = (target: ApiUser) =>
    target.permissions.includes('members.manage') ||
    target.permissions.includes('members.grant')

  const canTouch = (target: ApiUser) => {
    if (target.id === user.id) return false
    if (target.isSuper) return user.isSuper
    if (user.isSuper) return true
    if (targetHasManagement(target)) return false
    return actorCanManage || actorCanGrant
  }

  const canEditPermissions = (target: ApiUser) =>
    actorCanGrant && canTouch(target) && !target.isSuper

  const canResetPassword = (target: ApiUser) => actorCanManage && canTouch(target)

  const canDelete = (target: ApiUser) =>
    actorCanManage && canTouch(target) && !target.isSuper

  const openAdd = () => {
    setNewUsername('')
    setNewEmail('')
    setNewPassword('')
    setNewPermissions([])
    setError('')
    setModal({ type: 'add' })
  }

  const openPermissions = (target: ApiUser) => {
    setDraftPermissions([...target.permissions])
    setError('')
    setModal({ type: 'permissions', target })
  }

  const openPassword = (target: ApiUser) => {
    setPassword('')
    setConfirm('')
    setError('')
    setModal({ type: 'password', target })
  }

  const submitAdd = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.createUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        permissions: actorCanGrant ? newPermissions : [],
      })
      setNotice('成员已创建')
      setModal(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submitPermissions = async () => {
    if (!modal || modal.type !== 'permissions') return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.updatePermissions(modal.target.id, draftPermissions)
      setNotice('权限已更新')
      setModal(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submitPassword = async () => {
    if (!modal || modal.type !== 'password') return
    if (password.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.updateUser(modal.target.id, { password })
      setNotice(`已重置 ${modal.target.username} 的密码`)
      setModal(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submitDelete = async () => {
    if (!modal || modal.type !== 'delete') return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.removeUser(modal.target.id)
      setNotice('成员已删除')
      setModal(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submitBan = async () => {
    if (!banTarget) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.banUser(banTarget.id, {
        permanent: banPermanent,
        days: Number(banDays) || 7,
        reason: banReason,
      })
      setNotice(banPermanent ? '已永久封禁并拉黑邮箱' : `已封禁 ${banDays} 天`)
      setBanTarget(null)
      setBanReason('')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const unban = async (target: ApiUser) => {
    try {
      await adminApi.unbanUser(target.id)
      setNotice('已解除封禁')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const filteredUsers = users.filter((target) => {
    const keyword = query.trim().toLowerCase()
    if (
      keyword &&
      !target.username.toLowerCase().includes(keyword) &&
      !target.email.toLowerCase().includes(keyword)
    ) {
      return false
    }
    if (roleFilter === 'banned') return Boolean(target.banned)
    if (roleFilter !== 'all' && target.role !== roleFilter) return false
    return true
  })

  const summarize = (target: ApiUser) => {
    if (target.isSuper) return '全部权限'
    const labels: string[] = []
    if (target.permissions.includes('archive')) labels.push('档案（全部）')
    else {
      if (target.permissions.includes('archive.articles')) labels.push('文章')
      if (target.permissions.includes('archive.photos')) labels.push('照片')
      if (target.permissions.includes('archive.videos')) labels.push('视频')
    }
    if (target.permissions.includes('logs')) labels.push('日志')
    if (target.permissions.includes('guestbook')) labels.push('留言板')
    if (target.permissions.includes('forum')) labels.push('论坛（全部板块）')
    else {
      target.permissions
        .filter((permission) => /^forum\.\d+$/.test(permission))
        .forEach((permission) => {
          const boardId = Number(permission.split('.')[1])
          const board = boards.find((item) => item.id === boardId)
          if (board) labels.push(`论坛·${board.name}`)
        })
    }
    if (target.permissions.includes('members.manage')) labels.push('管理成员')
    if (target.permissions.includes('members.grant')) labels.push('授权权限')
    return labels.length ? labels.join(' · ') : '无'
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="成员与权限"
        subtitle="MEMBERS & PERMISSIONS"
        actions={
          actorCanManage ? (
            <AdminButton onClick={openAdd}>
              <Plus className="h-3 w-3" /> 新增成员
            </AdminButton>
          ) : undefined
        }
      >
        {loading ? (
          <p className="font-mono text-[10px] tracking-wider text-rhine-faint">加载中…</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex min-w-48 flex-1 items-center gap-2 border border-rhine-line bg-rhine-abyss/50 px-2 py-1.5">
                <Search className="h-3 w-3 text-rhine-faint" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索用户名或邮箱"
                  className="w-full bg-transparent font-mono text-[11px] text-rhine-ink outline-none placeholder:text-rhine-faint"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-[11px] text-rhine-dim outline-none"
              >
                <option value="all">全部角色</option>
                <option value="super">超级用户</option>
                <option value="admin">管理员</option>
                <option value="moderator">论坛管理员</option>
                <option value="user">普通用户</option>
                <option value="banned">已封禁</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-rhine-line/60 font-mono text-[9px] tracking-[0.22em] text-rhine-faint">
                    <th className="py-2 pr-3 font-normal">成员</th>
                    <th className="py-2 pr-3 font-normal">邮箱</th>
                    <th className="py-2 pr-3 font-normal">角色</th>
                    <th className="py-2 pr-3 font-normal">权限</th>
                    <th className="py-2 text-right font-normal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((target) => {
                    const self = target.id === user.id
                    return (
                      <tr
                        key={target.id}
                        className="border-b border-rhine-line/40 align-top font-mono text-[11px] text-rhine-dim"
                      >
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-rhine-ink">{target.username}</span>
                            {self && <AdminBadge tone="gold">当前账号</AdminBadge>}
                            {target.banned && (
                              <AdminBadge tone="red">
                                {target.bannedUntil
                                  ? `封禁至 ${target.bannedUntil.slice(0, 10)}`
                                  : '永久封禁'}
                              </AdminBadge>
                            )}
                            {target.status === 'disabled' && (
                              <AdminBadge tone="red">已禁用</AdminBadge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-rhine-dim">{target.email}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <AdminBadge
                            tone={
                              target.isSuper
                                ? 'gold'
                                : target.role === 'admin'
                                  ? 'cyan'
                                  : 'line'
                            }
                          >
                            {ROLE_LABELS[target.role]}
                          </AdminBadge>
                        </td>
                        <td className="max-w-[260px] py-3 pr-3 text-[10px] leading-relaxed tracking-wider">
                          {summarize(target)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canEditPermissions(target) && (
                              <AdminButton
                                variant="ghost"
                                onClick={() => openPermissions(target)}
                              >
                                <ShieldCheck className="h-3 w-3" /> 权限
                              </AdminButton>
                            )}
                            {canResetPassword(target) && (
                              <AdminButton
                                variant="ghost"
                                onClick={() => openPassword(target)}
                              >
                                <KeyRound className="h-3 w-3" /> 重置密码
                              </AdminButton>
                            )}
                            {canResetPassword(target) &&
                              (target.banned ? (
                                <AdminButton
                                  variant="ghost"
                                  onClick={() => void unban(target)}
                                >
                                  解封
                                </AdminButton>
                              ) : (
                                <AdminButton
                                  variant="danger"
                                  onClick={() => {
                                    setBanTarget(target)
                                    setBanPermanent(false)
                                    setBanReason('')
                                  }}
                                >
                                  <Ban className="h-3 w-3" /> 封禁
                                </AdminButton>
                              ))}
                            {canDelete(target) && (
                              <AdminButton
                                variant="danger"
                                onClick={() => setModal({ type: 'delete', target })}
                              >
                                <Trash2 className="h-3 w-3" /> 删除
                              </AdminButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-4 border-t border-rhine-line/50 pt-3 font-mono text-[9px] leading-relaxed tracking-wider text-rhine-faint">
          管理类账号之间互不可操作，仅超级用户例外。
        </div>
      </AdminPanel>

      {/* 新增成员 */}
      <AdminModal
        open={modal?.type === 'add'}
        onClose={() => setModal(null)}
        title="新增成员"
        subtitle="CREATE MEMBER"
        wide
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="用户名 / USERNAME">
              <AdminInput
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                placeholder="editor"
              />
            </AdminField>
            <AdminField label="邮箱 / EMAIL" hint="必填">
              <AdminInput
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="editor@example.com"
              />
            </AdminField>
          </div>
          <AdminField label="初始密码 / PASSWORD" hint="至少 6 位">
            <AdminInput
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </AdminField>

          {actorCanGrant ? (
            <div>
              <p className="mb-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                初始权限 / PERMISSIONS
              </p>
              <PermissionTree
                value={newPermissions}
                onChange={setNewPermissions}
                boards={boards}
                allowMemberPermissions={user.isSuper}
              />
            </div>
          ) : (
            <p className="border border-rhine-line/60 bg-rhine-abyss/30 px-3 py-2 font-mono text-[10px] tracking-wider text-rhine-faint">
              你没有「授权权限」，新成员将以普通用户身份创建，权限需由有授权权限的管理员分配。
            </p>
          )}

          <AdminError message={error} />
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setModal(null)}>
              取消
            </AdminButton>
            <AdminButton onClick={() => void submitAdd()} disabled={busy}>
              {busy ? '创建中…' : '创建成员'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* 编辑权限 */}
      <AdminModal
        open={modal?.type === 'permissions'}
        onClose={() => setModal(null)}
        title={`编辑权限 · ${modal?.type === 'permissions' ? modal.target.username : ''}`}
        subtitle="PERMISSIONS"
        wide
      >
        <div className="space-y-3">
          <PermissionTree
            value={draftPermissions}
            onChange={setDraftPermissions}
            boards={boards}
            allowMemberPermissions={user.isSuper}
          />
          <AdminError message={error} />
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setModal(null)}>
              取消
            </AdminButton>
            <AdminButton onClick={() => void submitPermissions()} disabled={busy}>
              {busy ? '保存中…' : '保存权限'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* 重置密码 */}
      <AdminModal
        open={modal?.type === 'password'}
        onClose={() => setModal(null)}
        title={`重置密码 · ${modal?.type === 'password' ? modal.target.username : ''}`}
        subtitle="RESET PASSWORD"
      >
        <div className="space-y-3">
          <p className="font-mono text-[10px] leading-relaxed tracking-wider text-rhine-faint">
            管理员重置无需原密码；用户自助修改密码需要在「设置」中验证原密码。
          </p>
          <AdminField label="新密码 / NEW PASSWORD" hint="至少 6 位">
            <AdminInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </AdminField>
          <AdminField label="确认新密码 / CONFIRM">
            <AdminInput
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
            />
          </AdminField>
          <AdminError message={error} />
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setModal(null)}>
              取消
            </AdminButton>
            <AdminButton onClick={() => void submitPassword()} disabled={busy}>
              {busy ? '保存中…' : '确认重置'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* 删除成员 */}
      <AdminModal
        open={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        title="删除成员"
        subtitle="DANGER"
      >
        <p className="font-mono text-[11px] leading-relaxed tracking-wider text-rhine-dim">
          确认删除「{modal?.type === 'delete' ? modal.target.username : ''}」？
          该账号的登录状态会被清除，此操作不可恢复。
        </p>
        <AdminError message={error} />
        <div className="mt-4 flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={() => setModal(null)}>
            取消
          </AdminButton>
          <AdminButton variant="danger" onClick={() => void submitDelete()} disabled={busy}>
            {busy ? '删除中…' : '确认删除'}
          </AdminButton>
        </div>
      </AdminModal>
      {/* 封禁 */}
      <AdminModal
        open={Boolean(banTarget)}
        onClose={() => setBanTarget(null)}
        title={`封禁 · ${banTarget?.username ?? ''}`}
        subtitle="BAN"
      >
        <div className="space-y-3">
          <AdminField label="封禁期限（天）" hint="1 - 3650">
            <AdminInput
              type="number"
              value={banDays}
              onChange={(event) => setBanDays(event.target.value)}
              disabled={banPermanent}
            />
          </AdminField>
          <AdminCheckbox
            checked={banPermanent}
            onChange={setBanPermanent}
            label="永久封禁（同时拉黑邮箱，无法再注册）"
          />
          <AdminField label="原因（可选）">
            <AdminInput
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              placeholder="违规原因"
            />
          </AdminField>
          <AdminError message={error} />
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setBanTarget(null)}>
              取消
            </AdminButton>
            <AdminButton variant="danger" onClick={() => void submitBan()} disabled={busy}>
              {busy ? '处理中…' : '确认封禁'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
