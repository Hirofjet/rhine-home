import { useEffect, useRef, useState } from 'react'
import { useSession } from '../auth/useSession'

/** 档案库 lab mode：完整 RHINE LAB 3D 场景，导航由外层统一侧栏提供。 */
export function LabArchiveView() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const pendingColumn = useRef<number | null>(null)
  const { user } = useSession()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('rhine:lab3d-theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    const applyPending = () => {
      if (pendingColumn.current === null) return
      const win = iframeRef.current?.contentWindow as unknown as {
        __rhineGoToColumn?: (lane: number) => void
      }
      if (!win?.__rhineGoToColumn) return
      win.__rhineGoToColumn(pendingColumn.current - 1)
      pendingColumn.current = null
    }
    window.dispatchEvent(new Event('rhine:lab-boot-start'))
    const timer = window.setInterval(() => {
      applyPending()
      const doc = iframeRef.current?.contentDocument
      const button = doc?.querySelector<HTMLElement>('[data-action="column-next"]')
      if (button && button.getBoundingClientRect().width > 0) {
        window.dispatchEvent(new Event('rhine:lab-ready'))
        window.clearInterval(timer)
      }
    }, 700)
    const onColumn = (event: Event) => {
      const column = Number((event as CustomEvent<number>).detail)
      if (!Number.isFinite(column)) return
      pendingColumn.current = column
      applyPending()
    }
    window.addEventListener('rhine:lab-column', onColumn)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('rhine:lab-column', onColumn)
    }
  }, [])

  useEffect(() => {
    const onColumn = (event: Event) => {
      pendingColumn.current = Number((event as CustomEvent<number>).detail)
    }
    window.addEventListener('rhine:lab-column', onColumn)
    return () => window.removeEventListener('rhine:lab-column', onColumn)
  }, [])

  useEffect(() => {
    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<'light' | 'dark'>).detail
      if (next !== 'light' && next !== 'dark') return
      setTheme(next)
    }
    window.addEventListener('rhine:lab3d-theme', onTheme)
    return () => {
      window.removeEventListener('rhine:lab3d-theme', onTheme)
    }
  }, [])

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'rhine:set-lab-theme', theme },
      window.location.origin,
    )
  }, [theme])

  const syncSettings = () => {
    const target = iframeRef.current?.contentWindow
    if (!target) return
    target.postMessage({ type: 'rhine:set-lab-theme', theme }, window.location.origin)
  }

  return (
    <div className="h-[calc(100dvh-64px)] min-h-[620px] w-full">
      <iframe
        ref={iframeRef}
        title="RHINE LAB // ARCHIVE"
        src={`/rhine-lab/index.html?theme=${theme}&user=${encodeURIComponent(
          user?.nickname || user?.username || 'Unknown Visitor',
        )}&t=${Date.now()}`}
        onLoad={syncSettings}
        className="h-full w-full border-0"
      />
    </div>
  )
}
