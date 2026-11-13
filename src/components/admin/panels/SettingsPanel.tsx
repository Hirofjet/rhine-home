import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { KeyRound } from 'lucide-react'
import {
  authApi,
  errorMessage,
  forumApi,
  ROLE_LABELS,
  type ApiUser,
  type Board,
} from '../../../lib/api'
import { PERMISSION_LABELS } from '../../../lib/adminPermissions'
import { PermissionTree } from '../PermissionTree'
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
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [mfaQr, setMfaQr] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaPassword, setMfaPassword] = useState('')
  const [boards, setBoards] = useState<Board[]>([])

  useEffect(() => {
    forumApi
      .boards()
      .then((data) => setBoards(data.boards))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    authApi
      .mfaStatus()
      .then((data) => setMfaEnabled(data.enabled))
      .catch(() => undefined)
  }, [])

  const startMfa = async () => {
    try {
      const data = await authApi.mfaSetup()
      setMfaSetup({ secret: data.secret, uri: data.uri })
      setMfaQr(await QRCode.toDataURL(data.uri, { margin: 1, width: 220 }))
      setNotice('请用认证器扫描二维码，然后输入 6 位验证码完成绑定。')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const enableMfa = async () => {
    try {
      await authApi.mfaEnable(mfaCode.trim())
      setMfaEnabled(true)
      setMfaSetup(null)
      setMfaQr('')
      setMfaCode('')
      setNotice('动态验证码已启用')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const disableMfa = async () => {
    try {
      await authApi.mfaDisable({ password: mfaPassword, code: mfaCode.trim() })
      setMfaEnabled(false)
      setMfaCode('')
      setMfaPassword('')
      setNotice('动态验证码已关闭')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

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
            管理员头衔：<span className="text-rhine-gold">{ROLE_LABELS[user.role]}</span>
          </p>
          <p>
            权限数量：
            <span className="text-rhine-ink">
              {user.isSuper ? '全部（超级用户）' : user.permissions.length}
            </span>
          </p>
        </div>
      </AdminPanel>

      <AdminPanel title="权限信息" subtitle="MY PERMISSIONS">
        <div className="mb-3 flex flex-wrap items-center gap-2 border border-rhine-gold/30 bg-rhine-gold/[0.04] p-3">
          <span className="font-mono text-[9px] tracking-[0.2em] text-rhine-gold">ADMIN TITLE</span>
          <span className="text-sm text-rhine-ink">{ROLE_LABELS[user.role]}</span>
          <span className="font-mono text-[9px] text-rhine-faint">
            {user.identity ?? 'member'} · {user.isSuper ? '全部权限' : `${user.permissions.length} 项权限`}
          </span>
        </div>
        <PermissionTree
          value={user.isSuper ? Object.keys(PERMISSION_LABELS) : user.permissions}
          onChange={() => undefined}
          boards={boards}
          allowMemberPermissions={false}
          disabled
        />
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

      <AdminPanel
        title="动态验证码 / MFA"
        subtitle="TWO-FACTOR AUTHENTICATION"
        actions={
          !mfaEnabled ? (
            <AdminButton onClick={() => void startMfa()} disabled={Boolean(mfaSetup)}>
              开始绑定
            </AdminButton>
          ) : null
        }
      >
        <div className="space-y-3 text-xs text-rhine-dim">
          <p>
            启用后，登录时除密码外还需要认证器生成的 6 位动态验证码。
            当前状态：
            <span className={mfaEnabled ? 'text-rhine-green' : 'text-rhine-faint'}>
              {mfaEnabled ? ' 已启用' : ' 未启用'}
            </span>
          </p>
          {mfaSetup && !mfaEnabled && (
            <div className="space-y-2 border border-rhine-line/60 bg-rhine-abyss/50 p-3">
              {mfaQr && (
                <img
                  src={mfaQr}
                  alt="MFA 二维码"
                  className="mx-auto h-[220px] w-[220px] bg-white p-2"
                />
              )}
              <p className="font-mono text-[9px] tracking-wider text-rhine-gold">
                手动密钥（保存到认证器）
              </p>
              <code className="block break-all font-mono text-xs text-rhine-ink">{mfaSetup.secret}</code>
              <p className="break-all font-mono text-[9px] text-rhine-faint">{mfaSetup.uri}</p>
              <AdminInput
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="输入 6 位验证码"
                inputMode="numeric"
                maxLength={6}
              />
              <AdminButton onClick={() => void enableMfa()} disabled={mfaCode.length !== 6}>
                完成绑定
              </AdminButton>
            </div>
          )}
          {mfaEnabled && (
            <div className="space-y-2">
              <AdminInput
                type="password"
                value={mfaPassword}
                onChange={(event) => setMfaPassword(event.target.value)}
                placeholder="当前密码"
              />
              <AdminInput
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="6 位动态验证码"
                inputMode="numeric"
                maxLength={6}
              />
              <AdminButton variant="danger" onClick={() => void disableMfa()}>
                关闭 MFA
              </AdminButton>
            </div>
          )}
        </div>
      </AdminPanel>
    </div>
  )
}
