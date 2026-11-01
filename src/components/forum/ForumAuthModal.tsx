import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, X } from 'lucide-react'
import {
  authApi,
  errorMessage,
} from '../../lib/api'
import { useSession } from '../auth/useSession'

type Tab = 'login' | 'register' | 'reset'

interface ForumAuthModalProps {
  open: boolean
  onClose: () => void
  initialTab?: Tab
  onSuccess?: () => void
}

const inputClass =
  'w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs text-rhine-ink outline-none transition-colors placeholder:text-rhine-faint focus:border-rhine-gold/70'
const buttonClass =
  'inline-flex items-center justify-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20 disabled:cursor-not-allowed disabled:opacity-50'
const ghostButtonClass =
  'inline-flex items-center justify-center gap-2 border border-rhine-line px-3 py-2 font-mono text-[11px] tracking-[0.16em] text-rhine-dim transition-colors hover:border-rhine-gold/50 hover:text-rhine-gold disabled:opacity-50'

/** 论坛登录 / 注册 / 找回密码（邮箱验证码） */
export function ForumAuthModal(props: ForumAuthModalProps) {
  if (!props.open) return null
  return <ForumAuthModalBody {...props} />
}

function ForumAuthModalBody({
  onClose,
  initialTab = 'login',
  onSuccess,
}: ForumAuthModalProps) {
  const { login } = useSession()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [devCode, setDevCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    timerRef.current = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [cooldown])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const sendCode = async () => {
    setError('')
    setNotice('')
    if (!email.trim()) {
      setError('请先填写邮箱')
      return
    }
    try {
      setBusy(true)
      const data = await authApi.emailCode(
        email.trim(),
        tab === 'reset' ? 'reset' : 'register',
      )
      setNotice('验证码已发送，请查收邮箱（10 分钟内有效）')
      if (data.devCode) {
        setDevCode(data.devCode)
        setNotice('开发模式：验证码已显示在下方')
      }
      setCooldown(60)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    setError('')
    setNotice('')
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    if (tab !== 'login' && password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    try {
      setBusy(true)
      if (tab === 'login') {
        await login(username.trim(), password)
        onSuccess?.()
        onClose()
        return
      }
      if (tab === 'register') {
        const data = await authApi.register({
          username: username.trim(),
          email: email.trim(),
          code: code.trim(),
          password,
        })
        // 注册后直接用返回的令牌登录
        localStorage.setItem('rhine:token', data.token)
        window.dispatchEvent(new Event('rhine:session'))
        onSuccess?.()
        onClose()
        return
      }
      await authApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        password,
      })
      setNotice('密码已重置，请使用新密码登录')
      setTab('login')
      setCode('')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
          <motion.div
            className="relative w-full max-w-md border border-rhine-gold/30 bg-rhine-panel/95 shadow-[0_0_60px_rgb(211_178_122/0.12)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-rhine-line/70 px-5 py-4">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                  RHINE//FORUM ACCESS
                </p>
                <h2 className="mt-1 font-display text-sm tracking-[0.18em] text-rhine-ink">
                  {tab === 'login'
                    ? '登录终端'
                    : tab === 'register'
                      ? '注册新账号'
                      : '重置密码'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border border-rhine-line p-1 text-rhine-faint transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold"
                aria-label="关闭"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex border-b border-rhine-line/60">
              {(
                [
                  ['login', '登录'],
                  ['register', '注册'],
                ] as Array<[Tab, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTab(key)
                    setError('')
                    setNotice('')
                  }}
                  className={`flex-1 px-3 py-2 font-mono text-[11px] tracking-[0.2em] transition-colors ${
                    tab === key
                      ? 'bg-rhine-gold/10 text-rhine-gold'
                      : 'text-rhine-faint hover:text-rhine-dim'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-3 px-5 py-4">
              {tab !== 'reset' && (
                <label className="block space-y-1">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                    用户名 / USERNAME
                  </span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputClass}
                    placeholder="username"
                    autoComplete="username"
                  />
                </label>
              )}

              {tab !== 'login' && (
                <label className="block space-y-1">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                    邮箱 / EMAIL
                  </span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
              )}

              {tab !== 'login' && (
                <div className="space-y-1">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                    邮箱验证码 / CODE
                  </span>
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className={inputClass}
                      placeholder="6 位验证码"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => void sendCode()}
                      disabled={busy || cooldown > 0}
                      className={`${ghostButtonClass} shrink-0`}
                    >
                      <Mail className="h-3 w-3" />
                      {cooldown > 0 ? `${cooldown}s` : '发送'}
                    </button>
                  </div>
                  {devCode && (
                    <p className="font-mono text-[10px] tracking-wider text-rhine-cyan">
                      开发模式验证码：{devCode}
                    </p>
                  )}
                </div>
              )}

              <label className="block space-y-1">
                <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                  密码 / PASSWORD
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                  placeholder="至少 6 位"
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              {tab !== 'login' && (
                <label className="block space-y-1">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                    确认密码 / CONFIRM
                  </span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className={inputClass}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                  />
                </label>
              )}

              {error && (
                <p className="border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] tracking-wider text-rhine-red">
                  {error}
                </p>
              )}
              {notice && (
                <p className="border border-rhine-green/40 bg-rhine-green/5 px-3 py-2 font-mono text-[10px] tracking-wider text-rhine-green">
                  {notice}
                </p>
              )}

              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className={`${buttonClass} w-full`}
              >
                {busy
                  ? '处理中…'
                  : tab === 'login'
                    ? '登录'
                    : tab === 'register'
                      ? '注册并登录'
                      : '重置密码'}
              </button>

              <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.18em] text-rhine-faint">
                {tab === 'login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('reset')
                      setError('')
                      setNotice('')
                    }}
                    className="hover:text-rhine-gold"
                  >
                    忘记密码？
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login')
                      setError('')
                      setNotice('')
                    }}
                    className="hover:text-rhine-gold"
                  >
                    返回登录
                  </button>
                )}
                <span>注册需邮箱验证码</span>
              </div>
            </div>
          </motion.div>
    </motion.div>
  )
}
