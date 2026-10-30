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
    value: 'github.com/Hirofjet',
    href: 'https://github.com/Hirofjet',
    icon: 'github',
    note: 'CODE',
  },
  {
    id: 'bilibili',
    label: '哔哩哔哩',
    labelEn: 'BILIBILI',
    value: 'UID：432976432',
    href: 'https://space.bilibili.com/',
    icon: 'bilibili',
    note: 'VIDEO',
  },
  {
    id: 'mail',
    label: '电子邮箱',
    labelEn: 'E-MAIL',
    value: '337265010@qq.com',
    href: 'mailto:337265010@qq.com',
    icon: 'mail',
    note: 'DIRECT',
  },
  {
    id: 'music',
    label: '酷狗音乐',
    labelEn: 'KUGOU MUSIC',
    value: 'ID：1278380529',
    href: 'https://activity.kugou.com/share/v-c7b4da67/index.html?id=93377639e20f539393376f9f012f5f1a',
    icon: 'music',
    note: 'MUSIC',
  },
]

/** 直连邮箱（复制按钮使用） */
export const emailAddress = '337265010@qq.com'
