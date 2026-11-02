/* ============================================================
   联络终端 —— 「联络终端」区块的数据源
   新增一行 = 多一条通讯频道；icon 可选值见 ContactIcon
   ============================================================ */

export type ContactIcon = 'github' | 'bilibili' | 'mail' | 'music' | 'chat'

export interface ContactLink {
  /** 唯一 id */
  id: string
  /** 频道名（中文） */
  label: string
  /** 频道名（英文小字） */
  labelEn: string
  /** 显示的账号值 */
  value: string
  /** 跳转链接 */
  href: string
  /** 图标（对应 lucide 图标映射，见 ContactSection.tsx 的 ICONS） */
  icon: ContactIcon
  /** 右侧小字备注 */
  note?: string
}

export const contactLinks: ContactLink[] = []

/** 直连邮箱（复制按钮使用） */
export const emailAddress = 'contact@example.com'
