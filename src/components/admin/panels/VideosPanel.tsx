import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { adminApi, type ContentVideo } from '../../../lib/api'
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

interface VideoDraft {
  id: number | null
  title: string
  description: string
  tags: string
  src: string
  poster: string
}

const emptyDraft = (): VideoDraft => ({
  id: null,
  title: '',
  description: '',
  tags: '',
  src: '',
  poster: '',
})

const toDraft = (item: ContentVideo): VideoDraft => ({
  id: item.id,
  title: item.title,
  description: item.description ?? '',
  tags: (item.tags ?? []).join(', '),
  src: item.src,
  poster: item.poster ?? '',
})

/** 视频管理：标题 + 简介 + 视频文件（上传或链接） */
export function VideosPanel() {
  const [items, setItems] = useState<ContentVideo[]>([])
  const [draft, setDraft] = useState<VideoDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = (await adminApi.list('videos')) as { items: ContentVideo[] }
      setItems(data.items)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    }
  }, [])

  useEffect(() => {
    let alive = true
    adminApi
      .list('videos')
      .then((data) => {
        if (alive) setItems((data as { items: ContentVideo[] }).items)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '加载失败')
      })
    return () => {
      alive = false
    }
  }, [])

  const updateDraft = (patch: Partial<VideoDraft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current))

  const save = async () => {
    if (!draft) return
    if (!draft.src.trim()) {
      setError('请先填写视频地址或上传视频文件')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        title: draft.title.trim() || '未命名视频',
        description: draft.description,
        tags: draft.tags,
        src: draft.src.trim(),
        poster: draft.poster.trim(),
      }
      if (draft.id) await adminApi.update('videos', draft.id, payload)
      else await adminApi.create('videos', payload)
      setNotice(draft.id ? '视频已更新' : '视频已发布')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ContentVideo) => {
    if (!window.confirm(`删除视频「${item.title}」？`)) return
    try {
      await adminApi.remove('videos', item.id)
      setNotice('视频已删除')
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
          title={draft.id ? '编辑视频' : '发布新视频'}
          subtitle="VIDEO EDITOR"
          actions={
            <>
              <AdminButton variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                取消
              </AdminButton>
              <AdminButton onClick={() => void save()} disabled={busy}>
                {busy ? '保存中…' : draft.id ? '保存修改' : '发布视频'}
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
                  placeholder="视频标题"
                />
              </AdminField>
              <AdminField label="标签 / TAGS" hint="用逗号分隔">
                <AdminInput
                  value={draft.tags}
                  onChange={(event) => updateDraft({ tags: event.target.value })}
                  placeholder="旅行, vlog"
                />
              </AdminField>
            </div>
            <AdminField label="简介 / DESCRIPTION">
              <AdminTextarea
                value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })}
                placeholder="简介会显示在播放器上方"
                className="min-h-24"
              />
            </AdminField>
            <SourceField
              kind="video"
              label="视频文件"
              hint="上传到服务器或填写视频链接"
              accept="video/*"
              value={draft.src}
              onChange={(value) => updateDraft({ src: value })}
            />
            <SourceField
              kind="file"
              label="封面图（可选）"
              accept="image/*"
              value={draft.poster}
              onChange={(value) => updateDraft({ poster: value })}
            />
          </div>
        </AdminPanel>
      ) : (
        <AdminPanel
          title="视频列表"
          subtitle="VIDEOS"
          actions={
            <AdminButton onClick={() => setDraft(emptyDraft())}>
              <Plus className="h-3 w-3" /> 发布新视频
            </AdminButton>
          }
        >
          {items.length === 0 ? (
            <p className="font-mono text-[11px] tracking-wider text-rhine-faint">
              还没有视频。
            </p>
          ) : (
            <ul className="divide-y divide-rhine-line/60">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-rhine-ink">{item.title}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] tracking-wider text-rhine-faint">
                      {item.src}
                    </p>
                  </div>
                  <AdminButton variant="ghost" onClick={() => setDraft(toDraft(item))}>
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
