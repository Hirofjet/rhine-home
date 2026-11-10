import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react'
import { useSession } from '../components/auth/useSession'
import { authApi } from '../lib/api'

type AuthTab = 'login' | 'register' | 'reset'

const inputClass =
  'mt-3 w-full border border-rhine-line bg-rhine-abyss px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-rhine-faint focus:border-rhine-gold/60'

export function LoginPage() {
  const { login, user } = useSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState<AuthTab>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaNeeded, setMfaNeeded] = useState(false)

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-sm border border-rhine-line bg-rhine-panel/60 p-6 text-center">
          <p className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">SESSION AUTHORIZED</p>
          <p className="mt-3 font-display text-xl text-rhine-gold">{user.nickname || user.username}</p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="mt-5 w-full border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-rhine-gold"
          >
            进入个人资料
          </button>
        </div>
      </div>
    )
  }

  const switchTab = (next: AuthTab) => {
    setTab(next)
    setError('')
    setNotice('')
    setPassword('')
    setConfirm('')
    setCode('')
  }

  const submitLogin = async () => {
    if (!username.trim() || !password || busy) return
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password, mfaCode.trim())
      navigate('/profile')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'mfa_required' || message === 'mfa_invalid') {
        setMfaNeeded(true)
        setError(message === 'mfa_invalid' ? '动态验证码错误。' : '请输入动态验证码。')
      } else {
        setError('登录失败，请检查账号和密码。')
      }
    } finally {
      setBusy(false)
    }
  }

  const sendCode = async (purpose: 'register' | 'reset') => {
    if (!email.trim() || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await authApi.emailCode(email.trim(), purpose)
      setNotice(data.devCode ? `验证码：${data.devCode}` : '验证码已发送到邮箱，10 分钟内有效。')
    } catch {
      setError('验证码发送失败，请检查邮箱。')
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async () => {
    if (!username.trim() || !email.trim() || !code.trim() || !password || busy) return
    if (password !== confirm) {
      setError('两次输入的密码不一致。')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        code: code.trim(),
        password,
      })
      localStorage.setItem('rhine:token', data.token)
      window.dispatchEvent(new Event('rhine:session'))
      navigate('/profile')
    } catch {
      setError('注册失败，请检查验证码或用户名是否已被占用。')
    } finally {
      setBusy(false)
    }
  }

  const submitReset = async () => {
    if (!email.trim() || !code.trim() || !password || busy) return
    if (password !== confirm) {
      setError('两次输入的密码不一致。')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await authApi.resetPassword({ email: email.trim(), code: code.trim(), password })
      setNotice('密码已重置，请使用新密码登录。')
      setTab('login')
      setPassword('')
      setConfirm('')
      setCode('')
    } catch {
      setError('重置失败，请检查邮箱验证码。')
    } finally {
      setBusy(false)
    }
  }

  const title = tab === 'login' ? '用户登录' : tab === 'register' ? '注册用户' : '找回密码'

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-24">
      <div className="w-full max-w-md border border-rhine-line bg-rhine-panel/60">
        <div className="border-b border-rhine-line px-6 pt-6 pb-4">
          <p className="font-mono text-[9px] tracking-[0.28em] text-rhine-gold">ACCESS AUTHORIZATION</p>
          <h1 className="mt-3 font-display text-2xl tracking-[0.08em]">{title}</h1>
          <div className="mt-5 grid grid-cols-2 border border-rhine-line">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex items-center justify-center gap-2 py-2 font-mono text-[10px] tracking-[0.18em] ${
                tab === 'login' ? 'bg-rhine-gold/10 text-rhine-gold' : 'text-rhine-dim'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> 登录
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex items-center justify-center gap-2 border-l border-rhine-line py-2 font-mono text-[10px] tracking-[0.18em] ${
                tab === 'register' ? 'bg-rhine-gold/10 text-rhine-gold' : 'text-rhine-dim'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> 注册
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {tab !== 'reset' && (
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="用户名"
              className={inputClass}
            />
          )}

          {tab === 'login' ? (
            <>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void submitLogin()}
                type="password"
                placeholder="密码"
                className={inputClass}
              />
              {mfaNeeded && (
                <input
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void submitLogin()}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="动态验证码（6 位）"
                  className={inputClass}
                />
              )}
              {notice && <p className="mt-3 font-mono text-[10px] text-rhine-cyan">{notice}</p>}
              {error && <p className="mt-3 font-mono text-[10px] text-rhine-red">{error}</p>}
              <button
                type="button"
                onClick={() => void submitLogin()}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-rhine-gold disabled:opacity-50"
              >
                <LogIn className="h-3.5 w-3.5" /> {busy ? 'AUTHORIZING' : 'LOGIN'}
              </button>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => switchTab('reset')}
                  className="font-mono text-[9px] tracking-[0.14em] text-rhine-faint hover:text-rhine-gold"
                >
                  忘记密码？
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className="font-mono text-[9px] tracking-[0.14em] text-rhine-faint hover:text-rhine-gold"
                >
                  还没有账号？注册用户
                </button>
              </div>
            </>
          ) : tab === 'register' ? (
            <>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="邮箱"
                className={inputClass}
              />
              <div className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="邮箱验证码"
                  className="min-w-0 flex-1 border border-rhine-line bg-rhine-abyss px-3 py-2.5 text-sm outline-none placeholder:text-rhine-faint focus:border-rhine-gold/60"
                />
                <button
                  type="button"
                  onClick={() => void sendCode('register')}
                  disabled={busy || !email.trim()}
                  className="flex items-center gap-2 border border-rhine-line px-3 font-mono text-[9px] tracking-[0.12em] text-rhine-dim disabled:opacity-40"
                >
                  <Mail className="h-3.5 w-3.5" /> 发送
                </button>
              </div>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="密码"
                className={inputClass}
              />
              <input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                type="password"
                placeholder="确认密码"
                className={inputClass}
              />
              {notice && <p className="mt-3 font-mono text-[10px] text-rhine-cyan">{notice}</p>}
              {error && <p className="mt-3 font-mono text-[10px] text-rhine-red">{error}</p>}
              <button
                type="button"
                onClick={() => void submitRegister()}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-rhine-gold disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" /> {busy ? 'CREATING ACCOUNT' : 'REGISTER'}
              </button>
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="mt-3 w-full py-2 font-mono text-[9px] tracking-[0.16em] text-rhine-faint hover:text-rhine-gold"
              >
                已有账号？返回登录
              </button>
            </>
          ) : (
            <>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="注册邮箱"
                className={inputClass}
              />
              <div className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="邮箱验证码"
                  className="min-w-0 flex-1 border border-rhine-line bg-rhine-abyss px-3 py-2.5 text-sm outline-none placeholder:text-rhine-faint focus:border-rhine-gold/60"
                />
                <button
                  type="button"
                  onClick={() => void sendCode('reset')}
                  disabled={busy || !email.trim()}
                  className="flex items-center gap-2 border border-rhine-line px-3 font-mono text-[9px] tracking-[0.12em] text-rhine-dim disabled:opacity-40"
                >
                  <Mail className="h-3.5 w-3.5" /> 发送
                </button>
              </div>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="新密码"
                className={inputClass}
              />
              <input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                type="password"
                placeholder="确认新密码"
                className={inputClass}
              />
              {notice && <p className="mt-3 font-mono text-[10px] text-rhine-cyan">{notice}</p>}
              {error && <p className="mt-3 font-mono text-[10px] text-rhine-red">{error}</p>}
              <button
                type="button"
                onClick={() => void submitReset()}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-rhine-gold disabled:opacity-50"
              >
                <KeyRound className="h-3.5 w-3.5" /> {busy ? 'RESETTING' : 'RESET PASSWORD'}
              </button>
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="mt-3 w-full py-2 font-mono text-[9px] tracking-[0.16em] text-rhine-faint hover:text-rhine-gold"
              >
                返回登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
