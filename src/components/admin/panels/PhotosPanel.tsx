import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Link2, Upload } from 'lucide-react'
import { adminApi, type ContentPhoto } from '../../../lib/api'
import {
  AdminButton,
  AdminCheckbox,
  AdminError,
  AdminInput,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'

/** 照片管理：批量上传（自动读 EXIF 日期）或用链接添加 */
export function PhotosPanel() {
  const [items, setItems] = useState<ContentPhoto[]>([])
  const [useLink, setUseLink] = useState(false)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

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
    let alive = true
    adminApi
      .list('photos')
      .then((data) => {
        if (alive) setItems((data as { items: ContentPhoto[] }).items)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '加载失败')
      })
    return () => {
      alive = false
    }
  }, [])

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      for (const file of Array.from(files)) {
        const uploaded = await adminApi.upload(file, 'photo')
        await adminApi.create('photos', {
          url: uploaded.url,
          name: uploaded.name,
          date: uploaded.date ?? '',
        })
      }
      setNotice(`已上传 ${files.length} 张照片`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setBusy(false)
    }
  }

  const addByLink = async () => {
    const url = link.trim()
    if (!url) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.create('photos', {
        url,
        name: url.split('/').pop() ?? 'photo',
        date: '',
      })
      setLink('')
      setNotice('照片已添加')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ContentPhoto) => {
    if (!window.confirm(`删除照片「${item.name}」？`)) return
    try {
      await adminApi.remove('photos', item.id)
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

      <AdminPanel
        title="添加照片"
        subtitle="PHOTOS"
        actions={
          <>
            <AdminCheckbox
              checked={useLink}
              onChange={setUseLink}
              label="使用文件链接"
            />
            {useLink ? (
              <div className="flex items-center gap-2">
                <AdminInput
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="https://…/photo.jpg"
                  className="w-56"
                />
                <AdminButton onClick={() => void addByLink()} disabled={busy}>
                  <Link2 className="h-3 w-3" /> 添加
                </AdminButton>
              </div>
            ) : (
              <>
                <AdminButton onClick={() => inputRef.current?.click()} disabled={busy}>
                  <Upload className="h-3 w-3" /> {busy ? '上传中…' : '选择照片上传'}
                </AdminButton>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void uploadFiles(event.target.files)
                    event.target.value = ''
                  }}
                />
              </>
            )}
          </>
        }
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border border-dashed border-rhine-line/80 p-8 text-center">
            <ImagePlus className="h-5 w-5 text-rhine-faint" />
            <p className="font-mono text-[11px] tracking-wider text-rhine-faint">
              还没有照片。上传时会自动读取 EXIF 拍摄日期用于时间线排序。
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden border border-rhine-line/70 bg-rhine-abyss/40"
              >
                <a href={item.url} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={item.url}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-32 w-full object-cover"
                  />
                </a>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[10px] text-rhine-ink">
                      {item.name}
                    </p>
                    <p className="font-mono text-[9px] text-rhine-faint">
                      {item.date || '日期未知'}
                    </p>
                  </div>
                  <AdminButton variant="danger" onClick={() => void remove(item)}>
                    删除
                  </AdminButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}
