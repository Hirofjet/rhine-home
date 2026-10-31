import { useRef, useState } from 'react'
import { Eye, FileUp, Loader2, Pencil, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Attachment } from '../../lib/api'
import { errorMessage, resolveMediaUrl, uploadFile } from '../../lib/api'

export interface ComposerValue {
  content: string
  attachments: Attachment[]
}

interface ContentComposerProps {
  value: ComposerValue
  onChange: (value: ComposerValue) => void
  onSubmit: () => void
  submitting?: boolean
  submitLabel?: string
  placeholder?: string
  compact?: boolean
}

const typeOfFile = (file: File): Attachment['type'] => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}

const kindOfType = (type: Attachment['type']) =>
  type === 'image' ? 'photo' : type === 'video' ? 'video' : 'file'

/** 论坛内容编辑器：markdown + 图片 / 视频 / 文件上传（提交后进入审核） */
export function ContentComposer({
  value,
  onChange,
  onSubmit,
  submitting = false,
  submitLabel = '提交（需审核）',
  placeholder = '用 markdown 写下你的内容…',
  compact = false,
}: ContentComposerProps) {
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setUploading(true)
    try {
      const next: Attachment[] = []
      for (const file of Array.from(files).slice(0, 6)) {
        const type = typeOfFile(file)
        const uploaded = await uploadFile(file, kindOfType(type))
        next.push({
          type,
          url: uploaded.url,
          name: uploaded.name,
          size: uploaded.size,
        })
      }
      onChange({
        ...value,
        attachments: [...value.attachments, ...next].slice(0, 12),
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    onChange({
      ...value,
      attachments: value.attachments.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] tracking-[0.16em] transition-colors ${
              preview
                ? 'border-transparent text-rhine-faint hover:text-rhine-dim'
                : 'border-rhine-gold/50 bg-rhine-gold/10 text-rhine-gold'
            }`}
          >
            <Pencil className="h-3 w-3" /> 编辑
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] tracking-[0.16em] transition-colors ${
              preview
                ? 'border-rhine-gold/50 bg-rhine-gold/10 text-rhine-gold'
                : 'border-transparent text-rhine-faint hover:text-rhine-dim'
            }`}
          >
            <Eye className="h-3 w-3" /> 预览
          </button>
        </div>
        <span className="font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
          内容需论坛管理员审核后公开
        </span>
      </div>

      {preview ? (
        <div
          className={`max-h-[420px] overflow-y-auto border border-rhine-line/70 bg-rhine-abyss/40 px-4 py-3 ${
            compact ? 'min-h-24' : 'min-h-40'
          }`}
        >
          {value.content.trim() ? (
            <div className="md-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="font-mono text-[10px] tracking-wider text-rhine-faint">
              还没有内容
            </p>
          )}
        </div>
      ) : (
        <textarea
          value={value.content}
          onChange={(event) => onChange({ ...value, content: event.target.value })}
          placeholder={placeholder}
          className={`w-full resize-y border border-rhine-line bg-rhine-abyss/60 px-3 py-2 font-mono text-xs leading-relaxed text-rhine-ink outline-none transition-colors placeholder:text-rhine-faint focus:border-rhine-gold/60 ${
            compact ? 'min-h-24' : 'min-h-52'
          }`}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.txt,.md,.zip"
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || submitting}
          className="inline-flex items-center gap-1.5 border border-rhine-line px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-rhine-dim transition-colors hover:border-rhine-cyan/60 hover:text-rhine-cyan disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FileUp className="h-3 w-3" />
          )}
          {uploading ? '上传中…' : '添加图片 / 视频 / 文件'}
        </button>
        <span className="font-mono text-[9px] tracking-[0.18em] text-rhine-faint">
          单个文件 ≤ 500MB · 最多 12 个
        </span>
      </div>

      {value.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.attachments.map((attachment, index) => (
            <li
              key={`${attachment.url}-${index}`}
              className="group relative flex items-center gap-2 border border-rhine-line/70 bg-rhine-panel/60 px-2 py-1"
            >
              {attachment.type === 'image' ? (
                <img
                  src={resolveMediaUrl(attachment.url)}
                  alt={attachment.name}
                  className="h-6 w-6 object-cover"
                />
              ) : (
                <span className="font-mono text-[9px] uppercase tracking-wider text-rhine-cyan">
                  {attachment.type}
                </span>
              )}
              <span className="max-w-[160px] truncate font-mono text-[10px] text-rhine-dim">
                {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-rhine-faint transition-colors hover:text-rhine-red"
                aria-label="移除附件"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] text-rhine-red">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || uploading}
          className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          {submitting ? '提交中…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
