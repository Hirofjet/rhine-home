import { useEffect, useRef, useState } from 'react'
import { Eye, ImagePlus, Loader2, Paperclip, Pencil } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Attachment } from '../../lib/api'
import { errorMessage, uploadFile } from '../../lib/api'
import { AttachmentGrid } from './AttachmentGrid'

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
  /** 回复模式：只允许图片 / GIF，全部插入正文 */
  imagesOnly?: boolean
}

/** 内容编辑器：图片插入正文（所见即所得预览），视频/文件作为附件 */
export function ContentComposer({
  value,
  onChange,
  onSubmit,
  submitting = false,
  submitLabel = '发布',
  placeholder = '写下内容…',
  compact = false,
  imagesOnly = false,
}: ContentComposerProps) {
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 自适应高度：长文不再受固定高度限制
  useEffect(() => {
    const element = textareaRef.current
    if (!element || preview) return
    element.style.height = 'auto'
    element.style.height = `${Math.max(element.scrollHeight, compact ? 120 : 320)}px`
  }, [value.content, preview, compact])

  const insertAtCursor = (text: string) => {
    const element = textareaRef.current
    if (!element) {
      onChange({ ...value, content: value.content + text })
      return
    }
    const start = element.selectionStart ?? value.content.length
    const end = element.selectionEnd ?? start
    const next = value.content.slice(0, start) + text + value.content.slice(end)
    onChange({ ...value, content: next })
    requestAnimationFrame(() => {
      element.focus()
      const position = start + text.length
      element.setSelectionRange(position, position)
    })
  }

  const markdownForImage = (name: string, url: string) => `\n![${name}](${url})\n`

  const handleImages = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setUploading(true)
    try {
      for (const file of Array.from(files).slice(0, 9)) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 30 * 1024 * 1024) {
          setError('单张图片不能超过 30MB')
          continue
        }
        const uploaded = await uploadFile(file, 'photo')
        insertAtCursor(markdownForImage(uploaded.name, uploaded.url))
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setUploading(true)
    try {
      const next: Attachment[] = []
      for (const file of Array.from(files).slice(0, 6)) {
        const type = file.type.startsWith('video/') ? 'video' : 'file'
        if (file.size > 500 * 1024 * 1024) {
          setError('单个附件不能超过 500MB')
          continue
        }
        const uploaded = await uploadFile(file, type === 'video' ? 'video' : 'file')
        next.push({ type, url: uploaded.url, name: uploaded.name, size: uploaded.size })
      }
      onChange({ ...value, attachments: [...value.attachments, ...next].slice(0, 12) })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
      <div className="flex flex-wrap items-center gap-1 border-b border-rhine-line/50 pb-2">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className={`inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] tracking-[0.14em] transition-colors ${
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
          className={`inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] tracking-[0.14em] transition-colors ${
            preview
              ? 'border-rhine-gold/50 bg-rhine-gold/10 text-rhine-gold'
              : 'border-transparent text-rhine-faint hover:text-rhine-dim'
          }`}
        >
          <Eye className="h-3 w-3" /> 预览
        </button>

        <span className="mx-1 h-4 w-px bg-rhine-line/60" />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,.gif"
          multiple
          className="hidden"
          onChange={(event) => void handleImages(event.target.files)}
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading || submitting}
          className="inline-flex items-center gap-1 border border-transparent px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-rhine-dim transition-colors hover:text-rhine-cyan disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
          图片
        </button>

        {!imagesOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,.pdf,.txt,.md,.zip"
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || submitting}
              className="inline-flex items-center gap-1 border border-transparent px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-rhine-dim transition-colors hover:text-rhine-cyan disabled:opacity-50"
            >
              <Paperclip className="h-3 w-3" /> 视频 / 文件
            </button>
          </>
        )}
      </div>

      {preview ? (
        <div className="min-h-40 border border-rhine-line/70 bg-rhine-abyss/40 px-4 py-3">
          {value.content.trim() ? (
            <div className="md-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="font-mono text-[10px] tracking-wider text-rhine-faint">还没有内容</p>
          )}
          <AttachmentGrid attachments={value.attachments} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value.content}
          onChange={(event) => onChange({ ...value, content: event.target.value })}
          placeholder={placeholder}
          className="w-full resize-none overflow-hidden border border-rhine-line bg-rhine-abyss/60 px-3 py-2 font-mono text-sm leading-relaxed text-rhine-ink outline-none transition-colors placeholder:text-rhine-faint focus:border-rhine-gold/60"
          style={{ minHeight: compact ? 120 : 320 }}
        />
      )}

      {value.attachments.length > 0 && (
        <ul className="space-y-1">
          {value.attachments.map((attachment, index) => (
            <li
              key={`${attachment.url}-${index}`}
              className="flex items-center gap-2 border border-rhine-line/60 bg-rhine-panel/50 px-2 py-1"
            >
              <span className="font-mono text-[9px] uppercase tracking-wider text-rhine-cyan">
                {attachment.type}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-rhine-dim">
                {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="font-mono text-[10px] text-rhine-faint hover:text-rhine-red"
              >
                移除
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
          className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-rhine-gold transition-colors hover:bg-rhine-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          {submitting ? '提交中…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
