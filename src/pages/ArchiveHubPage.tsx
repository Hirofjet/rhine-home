import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArchivePage } from './ArchivePage'
import { LogsPage } from './LogsPage'
import { ProjectsPage } from './ProjectsPage'
import { LabArchiveView } from '../components/lab/LabArchiveView'
import { ArticlesFeed } from '../components/slots/content/ArticlesFeed'
import { PhotoTimeline } from '../components/slots/content/PhotoTimeline'
import { VideosFeed } from '../components/slots/content/VideosFeed'
import { SectionTitle } from '../components/ui'
import { readViewMode, writeViewMode } from '../lib/viewMode'

const SECTION_META = {
  logs: { index: 'LOG', en: 'JOURNAL', zh: '日志' },
  articles: { index: 'ART', en: 'ARTICLES', zh: '文章' },
  photos: { index: 'PHO', en: 'PHOTOS', zh: '照片' },
  videos: { index: 'VID', en: 'VIDEOS', zh: '视频' },
  projects: { index: 'PRJ', en: 'PROJECT DATABASE', zh: '项目库' },
} as const

/** 档案库：lab mode / archive mode，含五个二级页面。 */
export function ArchiveHubPage() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(search)
  const mode = params.get('mode') === 'archive' ? 'archive' : 'lab'
  const section = pathname.split('/')[2] ?? ''
  const hasMode = params.get('mode') === 'lab' || params.get('mode') === 'archive'
  const routeMode = hasMode ? mode : readViewMode()
  const [activeMode, setActiveMode] = useState<'lab' | 'archive'>(routeMode)
  const resolvedMode = activeMode
  const resolvedSection = section || (resolvedMode === 'archive' ? 'logs' : '')

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
    writeViewMode(resolvedMode)
    if (!hasMode) {
      navigate(`/archive${section ? `/${section}` : '/logs'}?mode=${resolvedMode}`, { replace: true })
    } else if (resolvedMode === 'archive' && !section) {
      navigate('/archive/logs?mode=archive', { replace: true })
    }
  }, [hasMode, navigate, resolvedMode, section])

  if (resolvedMode === 'lab') {
    return (
      <div className="min-h-screen bg-rhine-abyss">
        <header className="flex h-16 items-center justify-between border-b border-rhine-line/50 px-5">
          <div>
            <p className="font-mono text-[8px] tracking-[0.28em] text-rhine-faint">ARCHIVE / LAB MODE</p>
            <h1 className="mt-1 font-display text-xl tracking-[0.12em]">档案库</h1>
          </div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-rhine-dim">
            {section ? section.toUpperCase() : 'LOG · ARTICLE · PHOTO · VIDEO · PROJECT'}
          </p>
        </header>
        <LabArchiveView />
      </div>
    )
  }

  const meta =
    resolvedSection === 'logs' || resolvedSection === 'articles' || resolvedSection === 'photos' || resolvedSection === 'videos' || resolvedSection === 'projects'
      ? SECTION_META[resolvedSection]
      : null

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      {meta && <SectionTitle index={meta.index} en={meta.en} zh={meta.zh} />}
      <div className={meta ? 'mt-8' : ''}>
        {resolvedSection === 'logs' ? (
          <LogsPage />
        ) : resolvedSection === 'projects' ? (
          <ProjectsPage />
        ) : resolvedSection === 'articles' ? (
          <ArticlesFeed />
        ) : resolvedSection === 'photos' ? (
          <PhotoTimeline />
        ) : resolvedSection === 'videos' ? (
          <VideosFeed />
        ) : (
          <ArchivePage />
        )}
      </div>
    </div>
  )
}
