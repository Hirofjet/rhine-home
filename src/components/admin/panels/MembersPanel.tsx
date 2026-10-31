import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, UserPlus } from 'lucide-react'
import {
  adminApi,
  PERMISSION_LABELS,
  type AdminUser,
  type PermissionKey,
} from '../../../lib/adminApi'
import {
  AdminButton,
  AdminCheckbox,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[]

interface MembersPanelProps {
  currentUser: AdminUser
}

/** 成员管理：新增管理员，并为每个成员勾选可管理的模块权限 */
export function MembersPanel({ currentUser }: MembersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [permissions, setPermissions] = useState<string[]>(['articles'])
  const [drafts, setDrafts] = useState<Record<number, string[]>>({})
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await adminApi.users()
      setUsers(data.users)
      setDrafts(
        Object.fromEntries(data.users.map((user) => [user.id, [...user.permissions]])),
      )
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    }
  }, [])

  useEffect(() => {
    let alive = true
    adminApi
      .users()
      .then((data) => {
        if (!alive) return
        setUsers(data.users)
        setDrafts(
          Object.fromEntries(
            data.users.map((user) => [user.id, [...user.permissions]]),
          ),
        )
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '加载失败')
      })
    return () => {
      alive = false
    }
  }, [])

  const create = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.createUser({
        username: username.trim(),
        password,
        permissions,
      })
      setUsername('')
      setPassword('')
      setPermissions(['articles'])
      setNotice('成员已创建')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const togglePermission = (id: number, key: string, checked: boolean) => {
    setDrafts((current) => {
      const list = current[id] ?? []
      return {
        ...current,
        [id]: checked ? [...list, key] : list.filter((item) => item !== key),
      }
    })
  }

  const savePermissions = async (user: AdminUser) => {
    try {
      await adminApi.updateUser(user.id, { permissions: drafts[user.id] ?? [] })
      setNotice(`已更新 ${user.username} 的权限`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  const resetPassword = async (user: AdminUser) => {
    const next = resetPasswords[user.id] ?? ''
    if (next.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    try {
      await adminApi.updateUser(user.id, { password: next })
      setResetPasswords((current) => ({ ...current, [user.id]: '' }))
      setNotice(`已重置 ${user.username} 的密码`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败')
    }
  }

  const remove = async (user: AdminUser) => {
    if (!window.confirm(`删除成员「${user.username}」？`)) return
    try {
      await adminApi.removeUser(user.id)
      setNotice('成员已删除')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel title="新增成员" subtitle="MEMBERS">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="用户名 / USERNAME">
            <AdminInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="editor"
            />
          </AdminField>
          <AdminField label="初始密码 / PASSWORD" hint="至少 6 位">
            <AdminInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </AdminField>
        </div>
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
            模块权限 / PERMISSIONS
          </p>
          <div className="flex flex-wrap gap-4">
            {PERMISSION_KEYS.map((key) => (
              <AdminCheckbox
                key={key}
                checked={permissions.includes(key)}
                onChange={(checked) =>
                  setPermissions((current) =>
                    checked
                      ? [...current, key]
                      : current.filter((item) => item !== key),
                  )
                }
                label={`${PERMISSION_LABELS[key]} (${key})`}
              />
            ))}
          </div>
        </div>
        <div className="mt-4">
          <AdminButton onClick={() => void create()} disabled={busy}>
            <UserPlus className="h-3 w-3" /> {busy ? '创建中…' : '创建成员'}
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel title="成员列表" subtitle="ACCOUNTS">
        <ul className="space-y-4">
          {users.map((user) => {
            const isOwner = user.role === 'owner'
            return (
              <li
                key={user.id}
                className="space-y-3 border border-rhine-line/70 bg-rhine-abyss/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <ShieldCheck
                    className={`h-4 w-4 ${isOwner ? 'text-rhine-gold' : 'text-rhine-cyan'}`}
                  />
                  <p className="font-mono text-xs text-rhine-ink">{user.username}</p>
                  <span className="border border-rhine-line px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
                    {isOwner ? 'OWNER' : 'ADMIN'}
                  </span>
                  {user.id === currentUser.id && (
                    <span className="font-mono text-[9px] tracking-[0.2em] text-rhine-gold">
                      THIS ACCOUNT
                    </span>
                  )}
                  {!isOwner && user.id !== currentUser.id && (
                    <AdminButton variant="danger" onClick={() => void remove(user)}>
                      删除
                    </AdminButton>
                  )}
                </div>

                {!isOwner && (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      {PERMISSION_KEYS.map((key) => (
                        <AdminCheckbox
                          key={key}
                          checked={(drafts[user.id] ?? []).includes(key)}
                          onChange={(checked) =>
                            togglePermission(user.id, key, checked)
                          }
                          label={PERMISSION_LABELS[key]}
                        />
                      ))}
                      <AdminButton
                        variant="ghost"
                        onClick={() => void savePermissions(user)}
                      >
                        保存权限
                      </AdminButton>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminInput
                        type="password"
                        value={resetPasswords[user.id] ?? ''}
                        onChange={(event) =>
                          setResetPasswords((current) => ({
                            ...current,
                            [user.id]: event.target.value,
                          }))
                        }
                        placeholder="新密码（至少 6 位）"
                        className="w-48"
                      />
                      <AdminButton
                        variant="ghost"
                        onClick={() => void resetPassword(user)}
                      >
                        重置密码
                      </AdminButton>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </AdminPanel>
    </div>
  )
}
