/* oxlint-disable react/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { adminApi, errorMessage, type ApiUser } from '../../../lib/api'
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
] as const

export function IdentityPanel({ actor }: { actor: ApiUser }) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
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
    adminApi
      .users()
      .then((data) => {
        setUsers(data.users)
        setDraft(Object.fromEntries(data.users.map((user) => [user.id, user.identity ?? 'member'])))
      })
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [])

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
    </div>
  )
}
