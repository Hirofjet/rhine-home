import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { authApi, errorMessage, ROLE_LABELS, type ApiUser } from '../../../lib/api'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'

export function SettingsPanel({ user }: { user: ApiUser }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async () => {
    setError('')
    setNotice('')
    if (newPassword.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    setBusy(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword })
      setNotice('密码已更新，其他设备的登录状态已失效')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <AdminPanel title="账号信息" subtitle="ACCOUNT">
        <div className="grid gap-3 font-mono text-[11px] tracking-wider text-rhine-dim sm:grid-cols-2">
          <p>
            用户名：<span className="text-rhine-ink">{user.username}</span>
          </p>
          <p>
            邮箱：<span className="text-rhine-ink">{user.email}</span>
          </p>
          <p>
            角色：<span className="text-rhine-gold">{ROLE_LABELS[user.role]}</span>
          </p>
          <p>
            权限：
            <span className="text-rhine-ink">
              {user.isSuper ? '全部（超级用户）' : user.permissions.join(' / ') || '无'}
            </span>
          </p>
        </div>
      </AdminPanel>

      <AdminPanel
        title="修改自己的密码"
        subtitle="SECURITY"
        actions={
          <AdminButton onClick={() => void submit()} disabled={busy}>
            <KeyRound className="h-3 w-3" /> {busy ? '保存中…' : '更新密码'}
          </AdminButton>
        }
      >
        <div className="space-y-3">
          <p className="font-mono text-[10px] leading-relaxed tracking-wider text-rhine-faint">
            必须提供当前密码；新密码需输入两次确认。超级管理员也只能在这里修改自己的密码，
            其他账号无法更改超级管理员的密码。
          </p>
          <AdminField label="当前密码 / CURRENT">
            <AdminInput
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="新密码 / NEW" hint="至少 6 位">
              <AdminInput
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </AdminField>
            <AdminField label="确认新密码 / CONFIRM">
              <AdminInput
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </AdminField>
          </div>
          <AdminError message={error} />
          <AdminNotice message={notice} />
        </div>
      </AdminPanel>
    </div>
  )
}
