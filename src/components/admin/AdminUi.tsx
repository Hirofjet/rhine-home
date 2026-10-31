import { useRef, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Upload, X } from 'lucide-react'
import { cx } from '../../lib/cx'
import { adminApi, errorMessage } from '../../lib/api'
import { formatBytes } from '../../lib/format'

type ButtonVariant = 'gold' | 'ghost' | 'danger' | 'cyan'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  gold: 'border-rhine-gold/60 bg-rhine-gold/10 text-rhine-gold hover:bg-rhine-gold/20',
  ghost: 'border-rhine-line text-rhine-dim hover:border-rhine-gold/50 hover:text-rhine-gold',
  danger: 'border-rhine-red/50 bg-rhine-red/5 text-rhine-red hover:bg-rhine-red/15',
  cyan: 'border-rhine-cyan/50 bg-rhine-cyan/5 text-rhine-cyan hover:bg-rhine-cyan/15',
}

export function AdminButton({
  children,
  variant = 'gold',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function AdminPanel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        'border border-rhine-line/70 bg-rhine-panel/30',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rhine-line/60 px-4 py-3">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.22em] text-rhine-ink">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
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
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
        {label}
        {hint && <span className="text-rhine-faint/70">— {hint}</span>}
      </span>
      {children}
    </label>
  )
}

const INPUT_STYLE =
  'w-full border border-rhine-line bg-rhine-abyss/60 px-2.5 py-1.5 font-mono text-[11px] text-rhine-ink outline-none transition-colors placeholder:text-rhine-faint focus:border-rhine-gold/60'

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(INPUT_STYLE, props.className)} />
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(INPUT_STYLE, 'resize-y', props.className)} />
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(INPUT_STYLE, props.className)} />
}

export function AdminCheckbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label
      className={cx(
        'inline-flex cursor-pointer items-center gap-2 font-mono text-[10px] tracking-wider',
        disabled ? 'cursor-not-allowed text-rhine-faint/60' : 'text-rhine-dim',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3 w-3 accent-[#d3b27a]"
      />
      {label}
    </label>
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

export function AdminBadge({
  children,
  tone = 'line',
}: {
  children: ReactNode
  tone?: 'line' | 'gold' | 'cyan' | 'green' | 'red'
}) {
  const tones = {
    line: 'border-rhine-line text-rhine-faint',
    gold: 'border-rhine-gold/50 text-rhine-gold',
    cyan: 'border-rhine-cyan/50 text-rhine-cyan',
    green: 'border-rhine-green/50 text-rhine-green',
    red: 'border-rhine-red/50 text-rhine-red',
  }
  return (
    <span
      className={cx(
        'border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.16em]',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={cx(
              'max-h-[88vh] w-full overflow-y-auto border border-rhine-gold/25 bg-rhine-panel shadow-[0_0_60px_rgb(0_0_0/0.6)]',
              wide ? 'max-w-3xl' : 'max-w-md',
            )}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-rhine-line/60 bg-rhine-panel/95 px-4 py-3 backdrop-blur">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                  {subtitle ?? 'RHINE//ADMIN'}
                </p>
                <h2 className="mt-1 font-mono text-xs tracking-[0.2em] text-rhine-ink">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border border-rhine-line p-1 text-rhine-faint transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold"
                aria-label="关闭"
              >
                <X className="h-3 w-3" />
              </button>
            </header>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** 上传 / 链接二选一的资源字段 */
export function SourceField({
  kind,
  label,
  hint,
  accept,
  value,
  onChange,
  placeholder,
}: {
  kind: 'file' | 'photo' | 'video'
  label: string
  hint?: string
  accept?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [useLink, setUseLink] = useState(() =>
    Boolean(value && !value.startsWith('/uploads/')),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const uploaded = await adminApi.upload(file, kind)
      onChange(uploaded.url)
      setMeta(
        `${uploaded.name} · ${formatBytes(uploaded.size)}${uploaded.date ? ` · ${uploaded.date}` : ''}`,
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2 border border-rhine-line/60 bg-rhine-abyss/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
          {label}
          {hint && <span className="ml-2 text-rhine-faint/70">{hint}</span>}
        </span>
        <AdminCheckbox
          checked={useLink}
          onChange={(checked) => {
            setUseLink(checked)
            if (checked) onChange('')
          }}
          label="使用文件链接"
        />
      </div>

      {useLink ? (
        <AdminInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? 'https://… 或 /uploads/…'}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <AdminButton
            variant="ghost"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-3 w-3" /> {busy ? '上传中…' : '选择文件上传'}
          </AdminButton>
          {value && (
            <span className="max-w-full truncate font-mono text-[9px] tracking-wider text-rhine-cyan">
              {value}
            </span>
          )}
        </div>
      )}

      {meta && (
        <p className="font-mono text-[9px] tracking-wider text-rhine-faint">{meta}</p>
      )}
      {error && (
        <p className="font-mono text-[9px] tracking-wider text-rhine-red">{error}</p>
      )}
    </div>
  )
}
