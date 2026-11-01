import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { errorMessage, forumApi, type Board } from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { ForumAuthModal } from '../components/forum/ForumAuthModal'
import { ContentComposer, type ComposerValue } from '../components/forum/ContentComposer'

export function ForumComposePage() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const [boards, setBoards] = useState<Board[]>([])
  const [boardSlug, setBoardSlug] = useState(search.get('board') ?? '')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [value, setValue] = useState<ComposerValue>({ content: '', attachments: [] })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [done, setDone] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    let alive = true
    forumApi
      .boards()
      .then((data) => {
        if (!alive) return
        setBoards(data.boards)
        if (!boardSlug) {
          const accessible = data.boards.find((item) => item.canAccess !== false)
          setBoardSlug(accessible?.slug ?? data.boards[0]?.slug ?? '')
        }
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
    // 只在首次加载板块列表
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const board = boards.find((item) => item.slug === boardSlug) ?? null

  const submit = async () => {
    if (!user) {
      setAuthOpen(true)
      return
    }
    if (!board) {
      setError('请选择板块')
      return
    }
    if (board.canAccess === false) {
      setError('你没有该板块的访问权限')
      return
    }
    if (!title.trim()) {
      setError('请填写标题')
      return
    }
    if (!value.content.trim()) {
      setError('内容不能为空')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await forumApi.createPost({
        boardId: board.id,
        title: title.trim(),
        content: value.content,
        attachments: value.attachments,
        tags: tags
          .split(/[,，\s]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8),
      })
      setDone(true)
      setNotice(result.message || '帖子已发布')
      window.setTimeout(() => navigate(`/forum/${board.slug}`), 1200)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint transition-colors hover:text-rhine-gold"
      >
        <ArrowLeft className="h-3 w-3" /> 返回论坛
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-rhine-ink sm:text-4xl">
        发布新帖
        <span className="ml-3 font-mono text-xs tracking-[0.25em] text-rhine-faint">
          / NEW THREAD
        </span>
      </h1>

      {!user ? (
        <div className="mt-8 border border-rhine-line/70 bg-rhine-panel/40 px-5 py-8 text-center">
          <p className="font-mono text-[11px] tracking-wider text-rhine-dim">
            发帖需要注册账号（邮箱验证）
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="mt-4 inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20"
          >
            登录 / 注册
          </button>
        </div>
      ) : done ? (
        <div className="mt-8 border border-rhine-green/40 bg-rhine-green/5 px-5 py-8 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-rhine-green" />
          <p className="mt-3 font-mono text-[11px] tracking-wider text-rhine-green">
            {notice || '已提交，等待论坛管理员审核'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to={`/forum/${board?.slug ?? ''}`}
              className="border border-rhine-line px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-rhine-dim transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold"
            >
              返回板块
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(false)
                setTitle('')
                setTags('')
                setValue({ content: '', attachments: [] })
                setNotice('')
              }}
              className="border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-rhine-gold"
            >
              继续发布
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block space-y-1">
            <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
              板块 / BOARD
            </span>
            <select
              value={boardSlug}
              onChange={(event) => setBoardSlug(event.target.value)}
              className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
            >
              {boards.map((item) => (
                <option
                  key={item.id}
                  value={item.slug}
                  disabled={item.canAccess === false}
                >
                  {item.name}
                  {item.canAccess === false
                    ? `（${item.access === 'core' ? '核心' : '需申请'}）`
                    : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
              标题 / TITLE
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="帖子标题"
              className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs text-rhine-ink outline-none placeholder:text-rhine-faint focus:border-rhine-gold/60"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
              标签 / TAGS
            </span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="用空格或逗号分隔，最多 8 个"
              className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs text-rhine-ink outline-none placeholder:text-rhine-faint focus:border-rhine-gold/60"
            />
          </label>

          <ContentComposer
            value={value}
            onChange={setValue}
            onSubmit={() => void submit()}
            submitting={submitting}
            submitLabel="发布"
            placeholder="正文（markdown），图片会插入到光标位置"
          />

          {error && (
            <p className="border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] text-rhine-red">
              {error}
            </p>
          )}
          {submitting && (
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-rhine-faint">
              <Loader2 className="h-3 w-3 animate-spin" /> 上传并提交中…
            </p>
          )}
        </div>
      )}

      <ForumAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
