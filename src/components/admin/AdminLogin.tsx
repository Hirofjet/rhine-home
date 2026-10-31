import { useState } from 'react'
import type { FormEvent } from 'react'
import { Diamond, Eye, EyeOff, LogIn } from 'lucide-react'
import { adminApi, type AdminUser } from '../../lib/adminApi'
import { AdminButton, AdminError, AdminField, AdminInput } from './AdminUi'

interface AdminLoginProps {
  onLogin: (user: AdminUser, token: string) => void
}

/** 管理员登录页（不依赖前台导航，独立入口） */
export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await adminApi.login(username.trim(), password)
      onLogin(data.user, data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rhine-abyss px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm border border-rhine-line bg-rhine-panel/85 p-6 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-rhine-gold/60 bg-rhine-gold/5">
            <Diamond className="h-4 w-4 text-rhine-gold" />
          </span>
          <div>
            <p className="font-display text-sm tracking-[0.2em] text-rhine-ink">
              RHINE//ADMIN
            </p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
              ACCESS CONTROL
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <AdminField label="用户 / USERNAME">
            <AdminInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="admin"
            />
          </AdminField>
          <AdminField label="密码 / PASSWORD">
            <div className="relative">
              <AdminInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-rhine-faint transition-colors hover:text-rhine-gold"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
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

          <AdminButton
            type="submit"
            disabled={busy}
            className="w-full justify-center py-2.5"
          >
            <LogIn className="h-3.5 w-3.5" />
            {busy ? 'VERIFYING …' : '登录 / SIGN IN'}
          </AdminButton>
        </div>

        <p className="mt-5 font-mono text-[9px] leading-relaxed tracking-wider text-rhine-faint">
          初始账号由服务端 ADMIN_USER / ADMIN_PASSWORD 环境变量创建；
          管理页面不会出现在前台导航中。
        </p>
      </form>
    </div>
  )
}
