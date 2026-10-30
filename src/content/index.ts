/* ============================================================
   内容配置统一出口
   页面/组件统一从这里 import，方便管理
   ============================================================ */

export * from './site'
export * from './profile'
export * from './abilities'
export * from './projects'
export * from './links'

// 注意：slots 不从这里导出（它包含 markdown/exifr 等较重依赖，
// 由页面直接 import '../content/slots' 以保持按需加载）
