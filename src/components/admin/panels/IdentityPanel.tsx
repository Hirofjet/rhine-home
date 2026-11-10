/* oxlint-disable react/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { adminApi, errorMessage, type ApiUser, type Board } from '../../../lib/api'
import { AdminButton, AdminError, AdminInput, AdminNotice, AdminPanel } from '../AdminUi'

const ROLES = [
  ['super', '超级管理员'],
  ['member', '普通成员'],
  ['normal_admin', '普通论坛管理员'],
  ['normal_master', '普通论坛总管理员'],
  ['special_admin', '特殊论坛管理员'],
  ['special_master', '特殊论坛总管理员'],
  ['core_admin', '核心论坛管理员'],
  ['core_master', '核心论坛总管理员'],
  ['forum_master', '论坛总管理员'],
  ['senior', '高级管理员'],
  ['regulator', '监管只读'],
] as const

export function IdentityPanel({ actor }: { actor: ApiUser }) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [boards, setBoards] = useState<Board[]>([])
  const [moderators, setModerators] = useState<
    Array<{
      id: number
      boardId: number
      boardName: string
      access: string
      userId: number
      username: string
      role: 'master' | 'admin'
    }>
  >([])
  const [modBoard, setModBoard] = useState('')
  const [modUser, setModUser] = useState('')
  const [modRole, setModRole] = useState<'master' | 'admin'>('admin')
  const [modQuery, setModQuery] = useState('')
  const [modAccess, setModAccess] = useState('all')
  const pageSize = 20
  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          !query.trim() ||
          user.username.toLowerCase().includes(query.trim().toLowerCase()) ||
          (user.identityLabel ?? '').includes(query.trim()),
      ),
    [users, query],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    adminApi.users()
      .then((data) => {
        setUsers(data.users)
        setDraft(Object.fromEntries(data.users.map((user) => [user.id, user.identity ?? 'member'])))
      })
      .catch((err: unknown) => setError(errorMessage(err)))
    Promise.all([adminApi.forumBoards(), adminApi.forumModerators()])
      .then(([boardData, modData]) => {
        setBoards(boardData.boards)
        setModerators(modData.moderators)
      })
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [])

  const loadModerators = async () => {
    try {
      const [boardData, modData] = await Promise.all([
        adminApi.forumBoards(),
        adminApi.forumModerators(),
      ])
      setBoards(boardData.boards)
      setModerators(modData.moderators)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const assignModerator = async () => {
    if (!modBoard || !modUser) {
      setError('请选择板块和成员')
      return
    }
    try {
      await adminApi.assignModerator({
        boardId: Number(modBoard),
        userId: Number(modUser),
        role: modRole,
      })
      setNotice('板块管理员已授权')
      setModBoard('')
      setModUser('')
      await loadModerators()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const removeModerator = async (id: number) => {
    try {
      await adminApi.removeModerator(id)
      setNotice('板块管理员已移除')
      await loadModerators()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const filteredModerators = moderators.filter(
    (item) =>
      (modAccess === 'all' || item.access === modAccess) &&
      (!modQuery.trim() ||
        item.boardName.toLowerCase().includes(modQuery.trim().toLowerCase()) ||
        item.username.toLowerCase().includes(modQuery.trim().toLowerCase())),
  )

  const apply = async (user: ApiUser) => {
    try {
      await adminApi.updateIdentity(user.id, draft[user.id] ?? 'member')
      setNotice(`已更新 ${user.username} 的身份`)
      const data = await adminApi.users()
      setUsers(data.users)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel title="身份管理" subtitle="IDENTITY GROUPS">
        <p className="mb-3 border border-rhine-line/60 bg-rhine-abyss/30 px-3 py-2 font-mono text-[9px] leading-relaxed text-rhine-faint">
          身份决定头衔与基础权限，不再自动把某一类论坛全部加入；板块权限请在「成员与权限 → 权限」中逐项分配。移除权限后，无法支撑当前身份时会自动降为普通成员。
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AdminInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="搜索成员或身份"
            className="max-w-60"
          />
          <span className="font-mono text-[9px] text-rhine-faint">
            {filtered.length} 位成员
          </span>
        </div>
        <ul className="divide-y divide-rhine-line/60">
          {visible.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-40 flex-1">
                <p className="text-sm text-rhine-ink">{user.username}</p>
                <p className="font-mono text-[9px] text-rhine-faint">{user.identityLabel ?? user.role}</p>
              </div>
              <select
                value={draft[user.id] ?? 'member'}
                disabled={user.isSuper || !actor.isSuper}
                onChange={(event) => setDraft({ ...draft, [user.id]: event.target.value })}
                className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[10px] text-rhine-ink"
              >
                {ROLES.filter(([value]) => value !== 'super' || user.isSuper).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <AdminButton
                variant="ghost"
                disabled={user.isSuper || !actor.isSuper}
                onClick={() => void apply(user)}
              >
                应用身份
              </AdminButton>
            </li>
          ))}
        </ul>
        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-rhine-faint">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← 上一页
            </button>
            <span>{page} / {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
              下一页 →
            </button>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="板块管理员" subtitle="BOARD MODERATORS">
        <p className="mb-3 font-mono text-[9px] leading-relaxed text-rhine-faint">
          每个板块 1 位总管理员、最多 4 位子管理员；每位子管理员最多管理 4 个板块。
        </p>
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
            className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[10px] text-rhine-ink"
          >
            <option value="all">全部类别</option>
            <option value="public">普通论坛</option>
            <option value="special">特殊论坛</option>
            <option value="core">核心论坛</option>
          </select>
        </div>
        <div className="mb-4 grid gap-2 border border-rhine-line/60 bg-rhine-abyss/30 p-3 sm:grid-cols-4">
          <select
            value={modBoard}
            onChange={(event) => setModBoard(event.target.value)}
            className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[10px] text-rhine-ink"
          >
            <option value="">选择板块</option>
            {boards
              .filter((board) => modAccess === 'all' || board.access === modAccess)
              .map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
          </select>
          <select
            value={modUser}
            onChange={(event) => setModUser(event.target.value)}
            className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[10px] text-rhine-ink"
          >
            <option value="">选择成员</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.username}</option>
            ))}
          </select>
          <select
            value={modRole}
            onChange={(event) => setModRole(event.target.value as 'master' | 'admin')}
            className="border border-rhine-line bg-rhine-abyss/70 px-2 py-1.5 font-mono text-[10px] text-rhine-ink"
          >
            <option value="admin">子管理员</option>
            <option value="master">总管理员</option>
          </select>
          <AdminButton onClick={() => void assignModerator()}>授权板块管理员</AdminButton>
        </div>
        <ul className="divide-y divide-rhine-line/60">
          {filteredModerators.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="text-xs text-rhine-ink">{item.username}</span>
              <span className="font-mono text-[10px] text-rhine-dim">{item.boardName}</span>
              <span className="border border-rhine-gold/40 px-1.5 py-0.5 font-mono text-[9px] text-rhine-gold">
                {item.role === 'master' ? '总管理员' : '子管理员'}
              </span>
              <AdminButton
                variant="danger"
                className="ml-auto"
                onClick={() => void removeModerator(item.id)}
              >
                移除
              </AdminButton>
            </li>
          ))}
          {filteredModerators.length === 0 && (
            <li className="py-2 text-xs text-rhine-faint">暂无板块管理员</li>
          )}
        </ul>
      </AdminPanel>
    </div>
  )
}
