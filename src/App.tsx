import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BootScreen } from './components/boot/BootScreen'
import { SessionProvider } from './components/auth/SessionProvider'
import { useSession } from './components/auth/useSession'
import { ThemeProvider } from './components/theme/ThemeProvider'
import { SiteSidebar } from './components/layout/SiteSidebar'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/admin'
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '')

const ArchiveHubPage = lazy(() =>
  import('./pages/ArchiveHubPage').then((m) => ({ default: m.ArchiveHubPage })),
)
const ForumHubPage = lazy(() =>
  import('./pages/ForumHubPage').then((m) => ({ default: m.ForumHubPage })),
)
const ForumComposePage = lazy(() =>
  import('./pages/ForumComposePage').then((m) => ({ default: m.ForumComposePage })),
)
const ForumPostPage = lazy(() =>
  import('./pages/ForumPostPage').then((m) => ({ default: m.ForumPostPage })),
)
const ForumBoardPage = lazy(() =>
  import('./pages/ForumBoardPage').then((m) => ({ default: m.ForumBoardPage })),
)
const GuestbookPage = lazy(() =>
  import('./pages/GuestbookPage').then((m) => ({ default: m.GuestbookPage })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const MessagesPage = lazy(() =>
  import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
)
const PublicUserPage = lazy(() =>
  import('./pages/PublicUserPage').then((m) => ({ default: m.PublicUserPage })),
)
const LegalPage = lazy(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })),
)
const ComplaintsPage = lazy(() =>
  import('./pages/ComplaintsPage').then((m) => ({ default: m.ComplaintsPage })),
)
const PolicyPage = lazy(() =>
  import('./pages/PolicyPage').then((m) => ({ default: m.PolicyPage })),
)
const RegulatorPage = lazy(() =>
  import('./pages/RegulatorPage').then((m) => ({ default: m.RegulatorPage })),
)
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const AdminAppPage = lazy(() =>
  import('./pages/AdminAppPage').then((m) => ({ default: m.AdminAppPage })),
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)

function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="animate-pulse-soft font-mono text-xs tracking-[0.35em] text-rhine-faint">
        LOADING MODULE
      </p>
    </div>
  )
}

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => window.clearTimeout(timer)
    }
    window.scrollTo({ top: 0 })
    return undefined
  }, [pathname, hash])
  return null
}

function BootGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith(ADMIN_PATH)
  const isApp = pathname === '/app' || pathname.startsWith('/app/')
  const [booted, setBooted] = useState(() => {
    if (isAdmin || isApp) return true
    try {
      return sessionStorage.getItem('rhine:booted') === '1'
    } catch {
      return false
    }
  })
  const finish = useCallback(() => {
    try {
      sessionStorage.setItem('rhine:booted', '1')
    } catch {
      /* ignore */
    }
    setBooted(true)
  }, [])
  return (
    <>
      {!booted && <BootScreen onFinished={finish} />}
      {children}
    </>
  )
}

function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useSession()
  if (loading) return <PageLoading />
  return user ? <>{children}</> : <NotFoundPage />
}

function Shell({ children }: { children: ReactNode }) {
  return <SiteSidebar>{children}</SiteSidebar>
}

function Page({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  return (
    <Suspense fallback={<PageLoading />}>
      <Shell>
        <div key={`${pathname}${search}`}>{children}</div>
      </Shell>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={BASENAME || undefined}>
      <ThemeProvider>
        <SessionProvider>
          <BootGate>
            <ScrollManager />
            <Routes>
              <Route path="/" element={<Shell><HomePage /></Shell>} />
              <Route path="/archive/*" element={<Page><ArchiveHubPage /></Page>} />
              <Route
                path="/forum"
                element={
                  <RequireUser>
                    <Page><ForumHubPage /></Page>
                  </RequireUser>
                }
              />
              <Route path="/forum/new" element={<RequireUser><Page><ForumComposePage /></Page></RequireUser>} />
              <Route path="/forum/post/:id" element={<RequireUser><Page><ForumPostPage /></Page></RequireUser>} />
              <Route path="/forum/:slug" element={<RequireUser><Page><ForumBoardPage /></Page></RequireUser>} />
              <Route path="/guestbook" element={<Page><GuestbookPage home /></Page>} />
              <Route path="/profile" element={<Page><ProfilePage /></Page>} />
              <Route path="/messages" element={<Page><MessagesPage /></Page>} />
              <Route path="/u/:id" element={<Page><PublicUserPage /></Page>} />
              <Route path="/legal" element={<Page><LegalPage /></Page>} />
              <Route path="/complaints" element={<Page><ComplaintsPage /></Page>} />
              <Route path="/privacy" element={<Page><PolicyPage /></Page>} />
              <Route path="/terms" element={<Page><PolicyPage /></Page>} />
              <Route path="/regulator" element={<Page><RegulatorPage /></Page>} />
              <Route path="/login" element={<Page><LoginPage /></Page>} />
              <Route
                path={`${ADMIN_PATH}/*`}
                element={
                  <Suspense fallback={<PageLoading />}>
                    <AdminPage />
                  </Suspense>
                }
              />
              <Route
                path="/app/*"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <AdminAppPage />
                  </Suspense>
                }
              />
              <Route path="/lab" element={<Navigate to="/archive?mode=lab" replace />} />
              <Route path="/forum-lab" element={<Navigate to="/forum?mode=lab" replace />} />
              <Route path="/projects" element={<Navigate to="/archive/projects?mode=archive" replace />} />
              <Route path="/logs" element={<Navigate to="/archive/logs?mode=archive" replace />} />
              <Route path="/forum-lab/*" element={<Navigate to="/forum?mode=lab" replace />} />
              <Route path="*" element={<Shell><NotFoundPage /></Shell>} />
            </Routes>
          </BootGate>
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
