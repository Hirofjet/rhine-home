import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { forumApi, accessLogApi, type Board } from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { useTheme, type ThemeId } from '../components/theme/ThemeProvider'
import { ThemeMenu } from '../components/theme/ThemeMenu'

/** 论坛专属 Lab：列 = 有权限访问的论坛，前后 = 帖子。 */
export function ForumLabPage({ embedded = false, active = true }: { embedded?: boolean; active?: boolean }) {
  const { theme, setTheme } = useTheme()
  const { user, loading } = useSession()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [iframeSrc, setIframeSrc] = useState('')
  const dark = theme === 'rhine-dark' || theme === 'noctis'
  const labTheme: Record<ThemeId, string> = {
    rhine: 'light',
    'rhine-dark': 'dark',
    archive: 'archive',
    sakura: 'sakura',
    noctis: 'noctis',
  }

  useEffect(() => {
    let live = true
    forumApi
      .boards()
      .then((data) => {
        if (live) setBoards(data.boards.filter((board) => board.canAccess))
        if (live) {
          void accessLogApi
            .write({ moduleType: 'forum', targetType: 'forum-lab', targetTitle: 'Forum 3D Archive' })
            .catch(() => undefined)
        }
      })
      .catch(() => {
        if (live) setBoards([])
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (loading || !boards || iframeSrc) return
    setIframeSrc(
      `/rhine-lab/index.html?mode=forum&theme=${labTheme[theme]}&user=${encodeURIComponent(user?.nickname || user?.username || 'Unknown Visitor')}`,
    )
    // The src is intentionally frozen after the first resolution. Session and
    // theme refreshes must not reload the 3D scene and replay its boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, loading, iframeSrc])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'rhine:theme-change') return
      const map: Record<string, ThemeId> = {
        light: 'rhine',
        dark: 'rhine-dark',
        archive: 'archive',
        sakura: 'sakura',
        noctis: 'noctis',
      }
      const next = map[String(event.data.theme)]
      if (next) setTheme(next)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [setTheme])

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.dispatchEvent(new Event('resize'))
    }, 120)
    return () => window.clearTimeout(timer)
  }, [active])

  if (loading || boards === null || !iframeSrc) {
    return (
      <main className="flex h-screen items-center justify-center bg-rhine-abyss font-mono text-[10px] tracking-[0.3em] text-rhine-dim">
        VERIFYING FORUM ACCESS...
      </main>
    )
  }

  if (boards.length === 0) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-5 bg-rhine-abyss px-6 text-rhine-ink">
        <Lock className="h-8 w-8 text-rhine-red" />
        <p className="font-mono text-xs tracking-[0.25em]">ACCESS DENIED</p>
        <p className="max-w-md text-center text-sm text-rhine-dim">
          当前账号没有可访问的论坛。请先在原论坛页面申请权限，或联系对应论坛管理员。
        </p>
        <Link to="/forum" className="border border-rhine-line px-4 py-2 font-mono text-[9px] tracking-[0.2em]">
          返回论坛
        </Link>
      </main>
    )
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#e8e5e1]">
      <iframe
        title="RHINE LAB // FORUM ARCHIVE"
        ref={iframeRef}
        src={iframeSrc}
        className="absolute inset-0 h-full w-full border-0"
      />
      <div
        className={`absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between gap-3 border-b px-3 font-mono text-[9px] tracking-[0.16em] backdrop-blur ${embedded ? 'hidden' : ''}`}
        style={{
          color: dark ? '#f1ede3' : '#171512',
          borderColor: dark ? '#ffffff26' : '#17151222',
          backgroundColor: dark ? '#05070bdd' : '#f4f1eccc',
        }}
      >
        <Link to="/forum" className="inline-flex items-center gap-2 opacity-75 hover:opacity-100">
          <ArrowLeft className="h-3.5 w-3.5" /> 返回论坛
        </Link>
        <span className="truncate">FORUM ARCHIVE · {boards.length} BOARDS</span>
        <ThemeMenu compact />
      </div>
    </main>
  )
}
