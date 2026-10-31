/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 留言板 / 后端的地址，例如 http://localhost:3001；留空则请求同源 /api */
  readonly VITE_API_BASE?: string
  /** 管理后台入口路径，默认 /admin（不出现在前台导航） */
  readonly VITE_ADMIN_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
