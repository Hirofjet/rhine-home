/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { ImagePlus, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { adminApi, type ContentPhoto } from '../../../lib/api'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
  AdminTextarea,
} from '../AdminUi'

interface PhotoDraft {
  id: number | null
  url: string
  name: string
  date: string
  description: string
  file: File | null
  preview: string
}

const emptyDraft = (): PhotoDraft => ({
  id: null,
  url: '',
  name: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  file: null,
  preview: '',
})

const toDraft = (item: ContentPhoto): PhotoDraft => ({
  id: item.id,
  url: item.url,
  name: item.name,
  date: item.date ?? '',
  description: item.description ?? '',
  file: null,
  preview: item.url,
})

export function PhotosPanel() {
  const [items, setItems] = useState<ContentPhoto[]>([])
  const [draft, setDraft] = useState<PhotoDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = (await adminApi.list('photos')) as { items: ContentPhoto[] }
      setItems(data.items)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateDraft = (patch: Partial<PhotoDraft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current))

  const startNew = () => {
    setDraft(emptyDraft())
    setNotice('')
    setError('')
  }

  const startEdit = (item: ContentPhoto) => {
    setDraft(toDraft(item))
    setNotice('')
    setError('')
  }

  const chooseFile = (file: File | undefined) => {
    if (!file) return
    updateDraft({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    })
  }

  const save = async () => {
    if (!draft) return
    if (!draft.file && !draft.url.trim()) {
      setError('请选择照片文件或填写图片地址')
      return
    }
    setBusy(true)
    setError('')
    try {
      let url = draft.url.trim()
      let name = draft.name.trim() || url.split('/').pop() || 'photo'
      let date = draft.date
      if (draft.file) {
        const uploaded = await adminApi.upload(draft.file, 'photo')
        url = uploaded.url
        name = name || uploaded.name
        if (!date) date = uploaded.date ?? ''
      }
      const payload = {
        url,
        name,
        date,
        description: draft.description,
      }
      if (draft.id) await adminApi.update('photos', draft.id, payload)
      else await adminApi.create('photos', payload)
      setNotice(draft.id ? '照片已更新' : '照片已发布')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ContentPhoto) => {
    if (!window.confirm(`删除照片「${item.name}」？`)) return
    try {
      await adminApi.remove('photos', item.id)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setNotice('照片已删除')
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
          title={draft.id ? '编辑照片' : '发布新照片'}
          subtitle="PHOTO EDITOR"
          actions={
            <>
              <AdminButton variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                取消
              </AdminButton>
              <AdminButton onClick={() => void save()} disabled={busy}>
                <ImagePlus className="h-3 w-3" /> {busy ? '保存中…' : draft.id ? '保存修改' : '发布照片'}
              </AdminButton>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="日期 / DATE">
              <AdminInput
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft({ date: event.target.value })}
              />
            </AdminField>
            <AdminField label="名称 / NAME">
              <AdminInput
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="照片名称"
              />
            </AdminField>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="上传文件 / FILE">
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-rhine-line bg-rhine-abyss/40 px-3 py-6 font-mono text-[10px] tracking-wider text-rhine-dim transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold">
                <Upload className="h-4 w-4" />
                {draft.file ? draft.file.name : '选择照片文件'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
            </AdminField>
            <AdminField label="图片地址 / URL">
              <AdminInput
                value={draft.url}
                onChange={(event) => updateDraft({ url: event.target.value, preview: event.target.value })}
                placeholder="https://…/photo.jpg"
              />
            </AdminField>
          </div>

          <AdminField label="描述 / DESCRIPTION">
            <AdminTextarea
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
              rows={3}
              className="min-h-20"
            />
          </AdminField>

          {(draft.preview || draft.url) && (
            <div className="mt-4 border border-rhine-gold/30 bg-rhine-panel/50 p-3">
              <img
                src={draft.preview || draft.url}
                alt={draft.name || '照片预览'}
                className="max-h-72 w-full object-contain"
              />
              <p className="mt-2 font-mono text-[10px] tracking-wider text-rhine-cyan">
                {draft.date || 'DATE'} · {draft.name || 'PHOTO'}
              </p>
              {draft.description && (
                <p className="mt-1 text-xs text-rhine-dim">{draft.description}</p>
              )}
            </div>
          )}
        </AdminPanel>
      ) : (
        <AdminPanel
          title="照片"
          subtitle="PHOTOS"
          actions={
            <AdminButton onClick={startNew}>
              <Plus className="h-3 w-3" /> 发布新照片
            </AdminButton>
          }
        >
          {items.length === 0 ? (
            <p className="font-mono text-[10px] tracking-wider text-rhine-faint">暂无照片</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="border border-rhine-line/70 bg-rhine-abyss/40">
                  <img src={item.url} alt={item.name} className="h-40 w-full object-cover" loading="lazy" />
                  <div className="p-3">
                    <p className="truncate text-sm text-rhine-ink">{item.name}</p>
                    <p className="mt-1 font-mono text-[9px] tracking-wider text-rhine-faint">
                      {item.date || '日期未填'}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <AdminButton variant="ghost" onClick={() => startEdit(item)}>
                        <Pencil className="h-3 w-3" /> 编辑
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => void remove(item)}>
                        <Trash2 className="h-3 w-3" /> 删除
                      </AdminButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      )}
    </div>
  )
}
