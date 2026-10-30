/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 留言板后端地址，例如 http://localhost:3001；留空则请求同源 /api */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
