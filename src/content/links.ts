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

export const contactLinks: ContactLink[] = [
  {
    id: 'github',
    label: 'GitHub',
    labelEn: '代码仓库',
    value: 'github.com/yourname',
    href: 'https://github.com/',
    icon: 'github',
    note: 'CODE',
  },
  {
    id: 'bilibili',
    label: '哔哩哔哩',
    labelEn: 'BILIBILI',
    value: 'UID：待填写',
    href: 'https://space.bilibili.com/',
    icon: 'bilibili',
    note: 'VIDEO',
  },
  {
    id: 'mail',
    label: '电子邮箱',
    labelEn: 'E-MAIL',
    value: 'you@example.com',
    href: 'mailto:you@example.com',
    icon: 'mail',
    note: 'DIRECT',
  },
  {
    id: 'music',
    label: '网易云音乐',
    labelEn: 'NETEASE MUSIC',
    value: 'ID：待填写',
    href: 'https://music.163.com/',
    icon: 'music',
    note: 'MUSIC',
  },
]

/** 直连邮箱（复制按钮使用） */
export const emailAddress = 'you@example.com'
