/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Trash2 } from 'lucide-react'
import { adminApi, errorMessage, forumApi, type Announcement } from '../../../lib/api'
import { AdminButton, AdminError, AdminField, AdminInput, AdminNotice, AdminPanel, AdminTextarea } from '../AdminUi'

export function ForumAnnouncementsPanel() {
  const [items, setItems] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await forumApi.announcements()
      setItems(data.announcements.filter((item) => !item.boardId))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const publish = async () => {
    if (!title.trim() || !content.trim()) return
    setBusy(true)
    try {
      await adminApi.createAnnouncement({ title: title.trim(), content: content.trim() })
      setTitle('')
      setContent('')
      setNotice('主页公告已发布')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    try {
      await adminApi.removeAnnouncement(id)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel title="主页公告" subtitle="FORUM ANNOUNCEMENTS">
        <div className="space-y-3">
          <AdminField label="标题 / TITLE">
            <AdminInput value={title} onChange={(event) => setTitle(event.target.value)} />
          </AdminField>
          <AdminField label="内容 / CONTENT">
            <AdminTextarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} />
          </AdminField>
          <AdminButton onClick={() => void publish()} disabled={busy}>
            <Megaphone className="h-3 w-3" /> {busy ? '发布中…' : '发布公告'}
          </AdminButton>
        </div>
      </AdminPanel>
      <AdminPanel title="已发布公告" subtitle="ACTIVE">
        <ul className="divide-y divide-rhine-line/60">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-rhine-ink">{item.title}</span>
              <AdminButton variant="danger" onClick={() => void remove(item.id)}>
                <Trash2 className="h-3 w-3" /> 删除
              </AdminButton>
            </li>
          ))}
          {items.length === 0 && <li className="py-2 text-xs text-rhine-faint">暂无公告</li>}
        </ul>
      </AdminPanel>
    </div>
  )
}
