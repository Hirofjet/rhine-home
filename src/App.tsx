import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BootScreen } from './components/boot/BootScreen'
import { SessionProvider } from './components/auth/SessionProvider'
import { BackgroundFX } from './components/layout/BackgroundFX'
import { MouseTrail } from './components/layout/MouseTrail'
import { Footer } from './components/layout/Footer'
import { NavBar } from './components/layout/NavBar'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

/** 后台入口路径（可用 VITE_ADMIN_PATH 自定义，前台导航中不出现） */
const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/admin'

// 非首页路由按需加载：markdown 解析、EXIF 等依赖只在进入对应页面时才下载
const ArchivePage = lazy(() =>
  import('./pages/ArchivePage').then((m) => ({ default: m.ArchivePage })),
)
const GuestbookPage = lazy(() =>
  import('./pages/GuestbookPage').then((m) => ({ default: m.GuestbookPage })),
)
const LogsPage = lazy(() =>
  import('./pages/LogsPage').then((m) => ({ default: m.LogsPage })),
)
const ProjectsPage = lazy(() =>
  import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
)
const ForumPage = lazy(() =>
  import('./pages/ForumPage').then((m) => ({ default: m.ForumPage })),
)
const ForumBoardPage = lazy(() =>
  import('./pages/ForumBoardPage').then((m) => ({ default: m.ForumBoardPage })),
)
const ForumPostPage = lazy(() =>
  import('./pages/ForumPostPage').then((m) => ({ default: m.ForumPostPage })),
)
const ForumComposePage = lazy(() =>
  import('./pages/ForumComposePage').then((m) => ({
    default: m.ForumComposePage,
  })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const PublicUserPage = lazy(() =>
  import('./pages/PublicUserPage').then((m) => ({ default: m.PublicUserPage })),
)
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
)

/** 懒加载页面的加载态 */
function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-24">
      <p className="animate-pulse-soft font-mono text-xs tracking-[0.35em] text-rhine-faint">
        LOADING MODULE …
      </p>
    </div>
  )
}

/** 路由变化时处理滚动：带 hash 平滑滚到锚点，否则回到顶部 */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const t = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 80)
      return () => clearTimeout(t)
    }
    window.scrollTo({ top: 0 })
    return undefined
  }, [pathname, hash])

  return null
}

/** 开机门：同会话内只播放一次开机动画；后台入口不播放 */
function BootGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith(ADMIN_PATH)

  const [booted, setBooted] = useState(() => {
    if (isAdmin) return true
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
      /* 忽略存储异常 */
    }
    setBooted(true)
  }, [])

  return (
    <>
      <AnimatePresence>
        {!booted && <BootScreen key="boot" onFinished={finish} />}
      </AnimatePresence>
      {booted && children}
    </>
  )
}

/** 前台页面切换动画 */
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <Suspense fallback={<PageLoading />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            {/* ==== 扩展模块页面：新增页面时在这里注册路由 ==== */}
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/forum/new" element={<ForumComposePage />} />
            <Route path="/forum/post/:id" element={<ForumPostPage />} />
            <Route path="/forum/:slug" element={<ForumBoardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/u/:id" element={<PublicUserPage />} />
            <Route path="/guestbook" element={<GuestbookPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

/** 前台站点布局（后台页面不套用这套布局） */
function PublicSite() {
  return (
    <>
      <BackgroundFX />
      <MouseTrail />
      <NavBar />
      <AnimatedRoutes />
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <BootGate>
          <ScrollManager />
          <Routes>
            {/* 后台：独立入口，不出现在前台导航 */}
            <Route
              path={`${ADMIN_PATH}/*`}
              element={
                <Suspense fallback={<PageLoading />}>
                  <AdminPage />
                </Suspense>
              }
            />
            <Route path="*" element={<PublicSite />} />
          </Routes>
        </BootGate>
      </SessionProvider>
    </BrowserRouter>
  )
}
