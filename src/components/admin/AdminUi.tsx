import { useRef, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { cx } from '../../lib/cx'
import { adminApi } from '../../lib/adminApi'

type ButtonVariant = 'gold' | 'ghost' | 'danger'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  gold: 'border-rhine-gold/60 bg-rhine-gold/10 text-rhine-gold hover:bg-rhine-gold/20',
  ghost:
    'border-rhine-line text-rhine-dim hover:border-rhine-gold/60 hover:text-rhine-gold',
  danger:
    'border-rhine-red/50 bg-rhine-red/5 text-rhine-red hover:bg-rhine-red/15',
}

export function AdminButton({
  variant = 'gold',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        BUTTON_STYLES[variant],
        className,
      )}
      {...props}
    />
  )
}

export function AdminInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs text-rhine-ink placeholder:text-rhine-faint focus:border-rhine-gold/60 focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function AdminTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        'min-h-40 w-full resize-y border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs leading-relaxed text-rhine-ink placeholder:text-rhine-faint focus:border-rhine-gold/60 focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function AdminCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] tracking-wider text-rhine-dim">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-rhine-gold"
      />
      {label}
    </label>
  )
}

export function AdminPanel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border border-rhine-line bg-rhine-panel/60">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rhine-line px-4 py-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-gold">
            {subtitle}
          </p>
          <h2 className="mt-0.5 text-sm text-rhine-ink">{title}</h2>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

interface SourceFieldProps {
  /** 当前地址（/uploads/... 或 http 链接） */
  value: string
  onChange: (
    value: string,
    meta?: { size?: number; name?: string; date?: string | null },
  ) => void
  kind: 'file' | 'photo' | 'video'
  label: string
  hint?: string
  accept?: string
}

/**
 * 文件来源选择：
 * - 勾选「使用文件链接」→ 直接填写链接
 * - 不勾选 → 选择本地文件并上传，自动填入地址
 */
export function SourceField({
  value,
  onChange,
  kind,
  label,
  hint,
  accept,
}: SourceFieldProps) {
  const [useLink, setUseLink] = useState(() => /^https?:/i.test(value))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const result = await adminApi.upload(file, kind)
      onChange(result.url, {
        size: result.size,
        name: result.name,
        date: result.date,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <AdminField label={label} hint={hint}>
        <div className="space-y-2">
          <AdminCheckbox
            checked={useLink}
            onChange={setUseLink}
            label="使用文件链接（不勾选则上传文件）"
          />
          {useLink ? (
            <AdminInput
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://… 或 /uploads/…"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <AdminButton
                variant="ghost"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? '上传中…' : '选择并上传文件'}
              </AdminButton>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-rhine-faint">
                {value || '尚未上传'}
              </span>
              {value && (
                <AdminButton variant="ghost" onClick={() => onChange('')}>
                  清除
                </AdminButton>
              )}
            </div>
          )}
        </div>
      </AdminField>
      {error && <p className="font-mono text-[10px] text-rhine-red">{error}</p>}
    </div>
  )
}

export function AdminError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] tracking-wider text-rhine-red">
      {message}
    </p>
  )
}

export function AdminNotice({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="border border-rhine-green/40 bg-rhine-green/5 px-3 py-2 font-mono text-[10px] tracking-wider text-rhine-green">
      {message}
    </p>
  )
}
