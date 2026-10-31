import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileUp, Plus } from 'lucide-react'
import type { ContentLog } from '../../../lib/contentApi'
import { adminApi } from '../../../lib/adminApi'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
  AdminTextarea,
} from '../AdminUi'

interface LogDraft {
  id: number | null
  title: string
  date: string
  markdown: string
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyDraft = (): LogDraft => ({
  id: null,
  title: '',
  date: today(),
  markdown: '',
})

const toDraft = (item: ContentLog): LogDraft => ({
  id: item.id,
  title: item.title,
  date: item.date ?? today(),
  markdown: item.markdown,
})

/** 日志管理：支持直接导入 markdown 文件（自动读取标题与日期） */
export function LogsPanel() {
  const [items, setItems] = useState<ContentLog[]>([])
  const [draft, setDraft] = useState<LogDraft | null>(null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      const data = (await adminApi.list('logs')) as { items: ContentLog[] }
      setItems(data.items)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    }
  }, [])

  useEffect(() => {
    let alive = true
    adminApi
      .list('logs')
      .then((data) => {
        if (alive) setItems((data as { items: ContentLog[] }).items)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '加载失败')
      })
    return () => {
      alive = false
    }
  }, [])

  const startNew = () => {
    setDraft(emptyDraft())
    setPreview(false)
    setNotice('')
    setError('')
  }

  const startEdit = (item: ContentLog) => {
    setDraft(toDraft(item))
    setPreview(false)
    setNotice('')
    setError('')
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const titleMatch = /^#\s+(.+?)\s*$/m.exec(text)
      const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(file.name)
      setDraft({
        id: draft?.id ?? null,
        title: titleMatch?.[1]?.trim() ?? file.name.replace(/\.md$/i, ''),
        date: dateMatch?.[1] ?? today(),
        markdown: text,
      })
      setPreview(false)
      setError('')
      setNotice(`已导入 ${file.name}，确认内容后点击发布`)
    } catch {
      setError('读取文件失败')
    }
  }

  const save = async () => {
    if (!draft) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        title: draft.title.trim() || '未命名日志',
        date: draft.date,
        markdown: draft.markdown,
      }
      if (draft.id) await adminApi.update('logs', draft.id, payload)
      else await adminApi.create('logs', payload)
      setNotice(draft.id ? '日志已更新' : '日志已发布')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ContentLog) => {
    if (!window.confirm(`删除日志「${item.title}」？`)) return
    try {
      await adminApi.remove('logs', item.id)
      setNotice('日志已删除')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  const updateDraft = (patch: Partial<LogDraft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current))

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <input
        ref={fileRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        className="hidden"
        onChange={(event) => {
          void importFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {draft ? (
        <AdminPanel
          title={draft.id ? '编辑日志' : '发布新日志'}
          subtitle="LOG EDITOR"
          actions={
            <>
              <AdminButton variant="ghost" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-3 w-3" /> 导入 md
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setPreview((value) => !value)}>
                {preview ? '编辑内容' : '预览'}
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                取消
              </AdminButton>
              <AdminButton onClick={() => void save()} disabled={busy}>
                {busy ? '保存中…' : draft.id ? '保存修改' : '发布日志'}
              </AdminButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="标题 / TITLE">
                <AdminInput
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="日志标题"
                />
              </AdminField>
              <AdminField label="日期 / DATE">
                <AdminInput
                  type="date"
                  value={draft.date}
                  onChange={(event) => updateDraft({ date: event.target.value })}
                />
              </AdminField>
            </div>
            <AdminField label="正文 / MARKDOWN">
              {preview ? (
                <div className="md-body min-h-40 border border-rhine-line bg-rhine-abyss/40 p-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {draft.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <AdminTextarea
                  value={draft.markdown}
                  onChange={(event) => updateDraft({ markdown: event.target.value })}
                  placeholder={'# 日志标题\n\n今天做了什么…'}
                />
              )}
            </AdminField>
          </div>
        </AdminPanel>
      ) : (
        <AdminPanel
          title="日志列表"
          subtitle="LOGS"
          actions={
            <>
              <AdminButton variant="ghost" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-3 w-3" /> 导入 md 文件
              </AdminButton>
              <AdminButton onClick={startNew}>
                <Plus className="h-3 w-3" /> 新建日志
              </AdminButton>
            </>
          }
        >
          {items.length === 0 ? (
            <p className="font-mono text-[11px] tracking-wider text-rhine-faint">
              还没有日志。可以直接导入 markdown 文件，或新建一篇。
            </p>
          ) : (
            <ul className="divide-y divide-rhine-line/60">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-rhine-ink">{item.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] tracking-wider text-rhine-faint">
                      {item.date || '未填日期'}
                    </p>
                  </div>
                  <AdminButton variant="ghost" onClick={() => startEdit(item)}>
                    编辑
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => void remove(item)}>
                    删除
                  </AdminButton>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      )}
    </div>
  )
}
