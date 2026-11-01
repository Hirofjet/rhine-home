import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Diamond, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react'
import { authApi, errorMessage } from '../../lib/api'
import { useSession } from '../auth/useSession'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
} from './AdminUi'

/** 后台登录（统一账号体系；无管理权限的账号会被拦截） */
export function AdminLogin() {
  const { login } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState('')
  const [devCode, setDevCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const sendCode = async () => {
    setError('')
    try {
      const data = await authApi.emailCode(email.trim(), 'reset')
      setNotice('验证码已发送（10 分钟内有效）')
      if (data.devCode) {
        setDevCode(data.devCode)
        setNotice('开发模式：验证码已显示在下方')
      }
      setCooldown(60)
      const timer = window.setInterval(() => {
        setCooldown((current) => {
          if (current <= 1) {
            window.clearInterval(timer)
            return 0
          }
          return current - 1
        })
      }, 1000)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const reset = async () => {
    setError('')
    if (newPassword.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (newPassword !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    try {
      await authApi.resetPassword({ email: email.trim(), code: code.trim(), password: newPassword })
      setNotice('密码已重置，请返回登录')
      setResetOpen(false)
      setPassword('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rhine-abyss px-4">
      <div className="w-full max-w-sm border border-rhine-gold/25 bg-rhine-panel/40 p-6 shadow-[0_0_70px_rgb(211_178_122/0.06)]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center border border-rhine-gold/60 bg-rhine-gold/5">
            <Diamond className="h-4 w-4 text-rhine-gold" />
          </span>
          <div>
            <p className="font-display text-xs tracking-[0.25em] text-rhine-ink">
              RHINE//ADMIN
            </p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
              CONTENT CONSOLE
            </p>
          </div>
        </div>

        {!resetOpen ? (          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            <AdminField label="账号 / USERNAME">
              <AdminInput
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                autoComplete="username"
              />
            </AdminField>
            <AdminField label="密码 / PASSWORD">
              <div className="relative">
                <AdminInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-rhine-faint hover:text-rhine-gold"
                  aria-label="显示密码"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </AdminField>

            <AdminError message={error} />
            <AdminNotice message={notice} />

            <AdminButton type="submit" className="w-full py-2" disabled={busy}>
              <LogIn className="h-3 w-3" /> {busy ? '验证中…' : '登录 / SIGN IN'}
            </AdminButton>

            <button
              type="button"
              onClick={() => {
                setResetOpen(true)
                setNotice('')
                setError('')
              }}
              className="font-mono text-[9px] tracking-[0.18em] text-rhine-faint hover:text-rhine-gold"
            >
              忘记密码？使用邮箱验证码重置
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-rhine-dim">
              <ShieldAlert className="h-3.5 w-3.5 text-rhine-gold" /> 通过账号绑定邮箱重置密码
            </p>
            <AdminField label="邮箱 / EMAIL">
              <AdminInput
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </AdminField>
            <AdminField label="验证码 / CODE">
              <div className="flex gap-2">
                <AdminInput
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="6 位验证码"
                />
                <AdminButton
                  variant="ghost"
                  onClick={() => void sendCode()}
                  disabled={cooldown > 0}
                  className="shrink-0"
                >
                  {cooldown > 0 ? `${cooldown}s` : '发送'}
                </AdminButton>
              </div>
              {devCode && (
                <p className="font-mono text-[9px] tracking-wider text-rhine-cyan">
                  开发模式验证码：{devCode}
                </p>
              )}
            </AdminField>
            <AdminField label="新密码 / NEW PASSWORD">
              <AdminInput
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </AdminField>
            <AdminField label="确认新密码 / CONFIRM">
              <AdminInput
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="再次输入"
              />
            </AdminField>
            <AdminError message={error} />
            <AdminNotice message={notice} />
            <div className="flex gap-2">
              <AdminButton variant="ghost" onClick={() => setResetOpen(false)}>
                返回登录
              </AdminButton>
              <AdminButton onClick={() => void reset()} disabled={busy}>
                重置密码
              </AdminButton>
            </div>
          </div>
        )}

        <Link
          to="/"
          className="mt-5 block border-t border-rhine-line/50 pt-3 text-center font-mono text-[10px] tracking-[0.18em] text-rhine-faint transition-colors hover:text-rhine-gold"
        >
          ← 返回主页
        </Link>
      </div>
    </div>
  )
}
