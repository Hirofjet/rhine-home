import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 字体：全部经 npm 本地打包，无外部 CDN 依赖（离线可用）
// 中文走系统字体栈（PingFang / 雅黑），这里只打包拉丁子集，体积最小
import '@fontsource/orbitron/latin-500.css'
import '@fontsource/orbitron/latin-700.css'
import '@fontsource/rajdhani/latin-400.css'
import '@fontsource/rajdhani/latin-500.css'
import '@fontsource/rajdhani/latin-600.css'
import '@fontsource/share-tech-mono/latin-400.css'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
