import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Plus } from 'lucide-react'
import type { ContentArticle } from '../../../lib/contentApi'
import { adminApi } from '../../../lib/adminApi'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
  AdminTextarea,
  SourceField,
} from '../AdminUi'

interface DownloadDraft {
  label: string
  file: string
  size: string
  note: string
}

interface ArticleDraft {
  id: number | null
  title: string
  date: string
  tags: string
  markdown: string
  downloads: DownloadDraft[]
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyDraft = (): ArticleDraft => ({
  id: null,
  title: '',
  date: today(),
  tags: '',
  markdown: '',
  downloads: [],
})

const toDraft = (item: ContentArticle): ArticleDraft => ({
  id: item.id,
  title: item.title,
  date: item.date ?? today(),
  tags: (item.tags ?? []).join(', '),
  markdown: item.markdown,
  downloads: (item.downloads ?? []).map((download) => ({
    label: download.label,
    file: download.file,
    size: download.size ?? '',
    note: download.note ?? '',
  })),
})

/** 文章管理：发布 / 编辑 / 删除，支持 markdown 预览与附件（上传或链接） */
export function ArticlesPanel() {
  const [items, setItems] = useState<ContentArticle[]>([])
  const [draft, setDraft] = useState<ArticleDraft | null>(null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = (await adminApi.list('articles')) as { items: ContentArticle[] }
      setItems(data.items)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    }
  }, [])

  useEffect(() => {
    let alive = true
    adminApi
      .list('articles')
      .then((data) => {
        if (alive) setItems((data as { items: ContentArticle[] }).items)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '加载失败')
      })
    return () => {
      alive = false
    }
  }, [])

  const updateDraft = (patch: Partial<ArticleDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  const startNew = () => {
    setDraft(emptyDraft())
    setPreview(false)
    setNotice('')
    setError('')
  }

  const startEdit = (item: ContentArticle) => {
    setDraft(toDraft(item))
    setPreview(false)
    setNotice('')
    setError('')
  }

  const updateDownload = (index: number, patch: Partial<DownloadDraft>) => {
    setDraft((current) => {
      if (!current) return current
      const downloads = current.downloads.map((download, i) =>
        i === index ? { ...download, ...patch } : download,
      )
      return { ...current, downloads }
    })
  }

  const save = async () => {
    if (!draft) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        title: draft.title.trim() || '未命名文章',
        date: draft.date,
        tags: draft.tags,
        markdown: draft.markdown,
        downloads: draft.downloads
          .filter((download) => download.file.trim())
          .map((download) => ({
            label: download.label.trim() || download.file.trim(),
            file: download.file.trim(),
            size: download.size.trim(),
            note: download.note.trim(),
          })),
      }
      if (draft.id) await adminApi.update('articles', draft.id, payload)
      else await adminApi.create('articles', payload)
      setNotice(draft.id ? '文章已更新' : '文章已发布')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ContentArticle) => {
    if (!window.confirm(`删除文章「${item.title}」？`)) return
    try {
      await adminApi.remove('articles', item.id)
      setNotice('文章已删除')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      {draft ? (
        <AdminPanel
          title={draft.id ? '编辑文章' : '发布新文章'}
          subtitle="ARTICLE EDITOR"
          actions={
            <>
              <AdminButton variant="ghost" onClick={() => setPreview((value) => !value)}>
                {preview ? '编辑内容' : '预览效果'}
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                取消
              </AdminButton>
              <AdminButton onClick={() => void save()} disabled={busy}>
                {busy ? '保存中…' : draft.id ? '保存修改' : '发布文章'}
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
                  placeholder="文章标题"
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
            <AdminField label="标签 / TAGS" hint="用逗号分隔">
              <AdminInput
                value={draft.tags}
                onChange={(event) => updateDraft({ tags: event.target.value })}
                placeholder="随笔, 开发"
              />
            </AdminField>

            <AdminField label="正文 / MARKDOWN" hint="支持表格、代码块、图片等 GFM 语法">
              {preview ? (
                <div className="md-body min-h-40 border border-rhine-line bg-rhine-abyss/40 p-4">
                  {draft.markdown.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {draft.markdown}
                    </ReactMarkdown>
                  ) : (
                    <p className="font-mono text-[10px] text-rhine-faint">
                      还没有内容
                    </p>
                  )}
                </div>
              ) : (
                <AdminTextarea
                  value={draft.markdown}
                  onChange={(event) => updateDraft({ markdown: event.target.value })}
                  placeholder={'# 标题\n\n正文内容…'}
                />
              )}
            </AdminField>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                  附件下载 / ATTACHMENTS
                </p>
                <AdminButton
                  variant="ghost"
                  onClick={() =>
                    updateDraft({
                      downloads: [
                        ...draft.downloads,
                        { label: '', file: '', size: '', note: '' },
                      ],
                    })
                  }
                >
                  <Plus className="h-3 w-3" /> 添加附件
                </AdminButton>
              </div>

              {draft.downloads.length === 0 && (
                <p className="font-mono text-[10px] text-rhine-faint">
                  暂无附件；勾选「使用文件链接」可直接填链接，否则上传本地文件
                </p>
              )}

              {draft.downloads.map((download, index) => (
                <div
                  key={index}
                  className="space-y-2 border border-rhine-line/70 bg-rhine-abyss/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                      附件 {index + 1}
                    </p>
                    <AdminButton
                      variant="danger"
                      onClick={() =>
                        updateDraft({
                          downloads: draft.downloads.filter((_, i) => i !== index),
                        })
                      }
                    >
                      删除
                    </AdminButton>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <AdminField label="链接文字">
                      <AdminInput
                        value={download.label}
                        onChange={(event) =>
                          updateDownload(index, { label: event.target.value })
                        }
                        placeholder="下载 PDF 版"
                      />
                    </AdminField>
                    <AdminField label="文件大小（可选）">
                      <AdminInput
                        value={download.size}
                        onChange={(event) =>
                          updateDownload(index, { size: event.target.value })
                        }
                        placeholder="1.2 MB"
                      />
                    </AdminField>
                  </div>
                  <SourceField
                    kind="file"
                    label="附件文件"
                    value={download.file}
                    onChange={(value, meta) =>
                      updateDownload(index, {
                        file: value,
                        size:
                          download.size ||
                          (meta?.size ? `${Math.round(meta.size / 1024)} KB` : ''),
                      })
                    }
                  />
                  <AdminField label="备注（可选）">
                    <AdminInput
                      value={download.note}
                      onChange={(event) =>
                        updateDownload(index, { note: event.target.value })
                      }
                      placeholder="含示例代码、补充说明…"
                    />
                  </AdminField>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>
      ) : (
        <AdminPanel
          title="文章列表"
          subtitle="ARTICLES"
          actions={
            <AdminButton onClick={startNew}>
              <Plus className="h-3 w-3" /> 发布新文章
            </AdminButton>
          }
        >
          {items.length === 0 ? (
            <p className="font-mono text-[11px] tracking-wider text-rhine-faint">
              还没有文章，点击右上角「发布新文章」开始。
            </p>
          ) : (
            <ul className="divide-y divide-rhine-line/60">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-rhine-ink">{item.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] tracking-wider text-rhine-faint">
                      {item.date || '未填日期'}
                      {item.tags?.length ? ` · ${item.tags.join(' / ')}` : ''}
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
