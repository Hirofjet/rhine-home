import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ForumLabPage } from './ForumLabPage'
import { ForumPage } from './ForumPage'
import { readViewMode, writeViewMode } from '../lib/viewMode'

/** 论坛：lab mode 使用 3D 论坛，archive mode 使用原论坛。 */
export function ForumHubPage() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const mode = params.get('mode') === 'archive' ? 'archive' : 'lab'
  const hasMode = params.get('mode') === 'lab' || params.get('mode') === 'archive'
  const routeMode = hasMode ? mode : readViewMode()
  const [activeMode, setActiveMode] = useState<'lab' | 'archive'>(routeMode)

  useEffect(() => {
    setActiveMode(routeMode)
  }, [routeMode])

  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<'lab' | 'archive'>).detail
      if (next === 'lab' || next === 'archive') setActiveMode(next)
    }
    window.addEventListener('rhine:mode-change', onChange)
    return () => window.removeEventListener('rhine:mode-change', onChange)
  }, [])

  useEffect(() => {
    writeViewMode(activeMode)
  }, [activeMode])

  const modeNow = activeMode

  if (modeNow === 'lab') {
    return (
      <div className="min-h-screen bg-rhine-abyss">
        <header className="flex h-16 items-center justify-between border-b border-rhine-line/50 px-5">
          <div>
            <p className="font-mono text-[8px] tracking-[0.28em] text-rhine-faint">FORUM / LAB MODE</p>
            <h1 className="mt-1 font-display text-xl tracking-[0.12em]">论坛</h1>
          </div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-rhine-dim">BOARD COLUMN · POST ROW</p>
        </header>
        <div className="h-[calc(100dvh-128px)] min-h-[620px]">
          <ForumLabPage embedded />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-2 pb-16 pt-6 lg:px-4">
      <ForumPage />
    </div>
  )
}
