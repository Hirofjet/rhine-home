import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../auth/useSession'
import { useTheme } from '../theme/ThemeProvider'
import {
  appThemeFromLabPage,
  isLab3DTheme,
  isLabPageTheme,
  labPageThemeFromApp,
} from '../../lib/labTheme'

/** 档案库 lab mode：完整 RHINE LAB 3D 场景，导航由外层统一侧栏提供。 */
export function LabArchiveView() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const navigate = useNavigate()
  const pendingColumn = useRef<number | null>(null)
  const { user } = useSession()
  const { theme: pageTheme, setTheme } = useTheme()
  const [lab3dTheme, setLab3dTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('rhine:lab3d-theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const [iframeSrc] = useState(
    () =>
      `/rhine-lab/index.html?theme=${lab3dTheme}&pageTheme=${labPageThemeFromApp(pageTheme)}&user=${encodeURIComponent(
        user?.nickname || user?.username || 'Unknown Visitor',
      )}&t=${Date.now()}`,
  )

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'rhine:lab3d-theme') {
        const next = event.data.theme
        if (!isLab3DTheme(next)) return
        setLab3dTheme(next)
        try {
          localStorage.setItem('rhine:lab3d-theme', next)
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new CustomEvent('rhine:lab3d-theme', { detail: next }))
        return
      }
      if (event.data?.type === 'rhine:page-theme') {
        const next = event.data.theme
        if (!isLabPageTheme(next)) return
        setTheme(appThemeFromLabPage(next))
        return
      }
      if (event.data?.type !== 'rhine:navigate') return
      const path = String(event.data.path ?? '')
      if (path.startsWith('/')) navigate(path)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate, setTheme])

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
      setLab3dTheme(next)
    }
    window.addEventListener('rhine:lab3d-theme', onTheme)
    return () => {
      window.removeEventListener('rhine:lab3d-theme', onTheme)
    }
  }, [])

  useEffect(() => {
    const target = iframeRef.current?.contentWindow
    if (!target) return
    target.postMessage({ type: 'rhine:set-lab-theme', theme: lab3dTheme }, window.location.origin)
    target.postMessage(
      { type: 'rhine:set-page-theme', theme: labPageThemeFromApp(pageTheme) },
      window.location.origin,
    )
  }, [lab3dTheme, pageTheme])

  const syncSettings = () => {
    const target = iframeRef.current?.contentWindow
    if (!target) return
    target.postMessage({ type: 'rhine:set-lab-theme', theme: lab3dTheme }, window.location.origin)
    target.postMessage(
      { type: 'rhine:set-page-theme', theme: labPageThemeFromApp(pageTheme) },
      window.location.origin,
    )
  }

  return (
    <div className="h-[calc(100dvh-64px)] min-h-[620px] w-full">
      <iframe
        ref={iframeRef}
        title="RHINE LAB // ARCHIVE"
        src={iframeSrc}
        onLoad={syncSettings}
        className="h-full w-full border-0"
      />
    </div>
  )
}
