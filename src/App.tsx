import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BootScreen } from './components/boot/BootScreen'
import { BackgroundFX } from './components/layout/BackgroundFX'
import { Footer } from './components/layout/Footer'
import { NavBar } from './components/layout/NavBar'
import { ArchivePage } from './pages/ArchivePage'
import { HomePage } from './pages/HomePage'
import { LabPage } from './pages/LabPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProjectsPage } from './pages/ProjectsPage'

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

/** 开机门：同会话内只播放一次开机动画，之后直接进入站点 */
function BootGate({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(() => {
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

export default function App() {
  return (
    <BrowserRouter>
      <BootGate>
        <ScrollManager />
        <BackgroundFX />
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* ==== 扩展模块页面：新增页面时在这里注册路由 ==== */}
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/lab" element={<LabPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </BootGate>
    </BrowserRouter>
  )
}
