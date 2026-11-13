import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react'
import { authApi, errorMessage } from '../../lib/api'

interface MfaCardProps {
  className?: string
}

/** 普通用户与管理员共用的 TOTP MFA 卡片；默认关闭，由用户自行开启。 */
export function MfaCard({ className = '' }: MfaCardProps) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    authApi
      .mfaStatus()
      .then((data) => setEnabled(data.enabled))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const start = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await authApi.mfaSetup()
      setSetup({ secret: data.secret, uri: data.uri })
      setQr(await QRCode.toDataURL(data.uri, { margin: 1, width: 220 }))
      setNotice('用认证器扫描二维码，或手动输入密钥，然后输入 6 位验证码。')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const enable = async () => {
    setBusy(true)
    setError('')
    try {
      await authApi.mfaEnable(code.trim())
      setEnabled(true)
      setSetup(null)
      setQr('')
      setCode('')
      setNotice('动态验证码已开启，下次登录需要输入验证码。')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    setError('')
    try {
      await authApi.mfaDisable({ password, code: code.trim() })
      setEnabled(false)
      setPassword('')
      setCode('')
      setNotice('动态验证码已关闭。')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`border border-rhine-line/70 bg-rhine-panel/30 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
          <ShieldCheck className="h-3 w-3" /> 动态验证码 / MFA
        </p>
        <span
          className={`border px-2 py-0.5 font-mono text-[9px] ${
            enabled
              ? 'border-rhine-green/40 text-rhine-green'
              : 'border-rhine-line text-rhine-faint'
          }`}
        >
          {loading ? '检查中…' : enabled ? '已开启' : '未开启'}
        </span>
      </div>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-rhine-dim">
        默认关闭。开启后登录除密码外，还需要认证器生成的 6 位动态验证码。
      </p>

      {!enabled && !setup && (
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy || loading}
          className="mt-3 border border-rhine-gold/60 bg-rhine-gold/10 px-3 py-2 font-mono text-[10px] text-rhine-gold disabled:opacity-40"
        >
          开始绑定
        </button>
      )}

      {setup && !enabled && (
        <div className="mt-3 space-y-3 border border-rhine-line/60 bg-rhine-abyss/40 p-3">
          {qr && (
            <img
              src={qr}
              alt="MFA 二维码"
              className="mx-auto h-[220px] w-[220px] bg-white p-2"
            />
          )}
          <div>
            <p className="font-mono text-[9px] tracking-wider text-rhine-faint">手动密钥</p>
            <code className="mt-1 block break-all font-mono text-xs text-rhine-ink">{setup.secret}</code>
          </div>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="输入 6 位验证码"
            className="w-full border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-sm tracking-[0.3em] outline-none focus:border-rhine-gold/60"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy || code.length !== 6}
              className="border border-rhine-gold/60 bg-rhine-gold/10 px-3 py-2 font-mono text-[10px] text-rhine-gold disabled:opacity-40"
            >
              完成绑定
            </button>
            <button
              type="button"
              onClick={() => {
                setSetup(null)
                setQr('')
                setCode('')
              }}
              className="border border-rhine-line px-3 py-2 font-mono text-[10px] text-rhine-dim"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="mt-3 space-y-2 border border-rhine-red/20 bg-rhine-red/[0.03] p-3">
          <p className="flex items-center gap-1.5 font-mono text-[9px] text-rhine-red">
            <ShieldOff className="h-3 w-3" /> 关闭需要密码和当前验证码
          </p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="当前密码"
            autoComplete="current-password"
            className="w-full border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-xs outline-none"
          />
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="6 位动态验证码"
            className="w-full border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-xs tracking-[0.25em] outline-none"
          />
          <button
            type="button"
            onClick={() => void disable()}
            disabled={busy || !password || code.length !== 6}
            className="inline-flex items-center gap-1.5 border border-rhine-red/50 px-3 py-2 font-mono text-[10px] text-rhine-red disabled:opacity-40"
          >
            <KeyRound className="h-3 w-3" /> 关闭 MFA
          </button>
        </div>
      )}

      {error && <p className="mt-2 font-mono text-[10px] text-rhine-red">{error}</p>}
      {notice && <p className="mt-2 font-mono text-[10px] leading-relaxed text-rhine-cyan">{notice}</p>}
    </div>
  )
}
