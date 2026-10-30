/* ============================================================
   站点元信息与导航配置
   —— 修改这里的字段即可改变整个站点的标题、导航与页脚
   ============================================================ */

export const site = {
  /** 站点名（导航 Logo 大字） */
  title: 'Hirofjet//HOME',
  /** 站点名小字 */
  titleSub: 'PERSONAL TERMINAL',
  /** 中文标语 */
  slogan: '菲羽猫的个人主页',
  /** 干员编号（会出现在开机画面、Hero 状态栏等处） */
  operatorId: 'RL-0001',
  /** 时区（用于页内时钟显示） */
  timezone: 'Asia/Shanghai',
  footer: {
    line1: 'Hirofjet//HOME — 菲羽猫的个人主页',
    line2: '本页面视觉风格致敬《明日方舟》莱茵生命；相关设定与素材归鹰角网络所有，仅作个人学习与展示用途。',
    builtWith: 'React · Vite · TypeScript · Tailwind CSS · Framer Motion',
  },
}

export interface NavItem {
  /** 唯一 id */
  id: string
  /** 中文名 */
  label: string
  /** 英文小字 */
  labelEn: string
  /** 链接地址：首页锚点为 /#xxx，独立页面为 /xxx */
  href: string
  /** 对应的页面锚点区块 id（用于首页滚动高亮），独立页面可不填 */
  section?: string
}

/** 主导航（首页区块锚点） */
export const navItems: NavItem[] = [
  { id: 'home', label: '首页', labelEn: 'HOME', href: '/#hero', section: 'hero' },
  {
    id: 'dossier',
    label: '档案',
    labelEn: 'DOSSIER',
    href: '/#dossier',
    section: 'dossier',
  },
  {
    id: 'abilities',
    label: '能力',
    labelEn: 'MODULES',
    href: '/#abilities',
    section: 'abilities',
  },
  {
    id: 'projects',
    label: '项目',
    labelEn: 'PROJECTS',
    href: '/#projects',
    section: 'projects',
  },
  {
    id: 'contact',
    label: '联络',
    labelEn: 'CONTACT',
    href: '/#contact',
    section: 'contact',
  },
]

/** 扩展模块导航（独立页面，为后续新内容预留的入口） */
export const moduleLinks: NavItem[] = [
  { id: 'archive', label: '档案库', labelEn: 'ARCHIVE', href: '/archive' },
  { id: 'project-db', label: '项目库', labelEn: 'PROJECT DB', href: '/projects' },
  { id: 'logs', label: '日志', labelEn: 'LOGS', href: '/logs' },
  { id: 'guestbook', label: '留言板', labelEn: 'GUESTBOOK', href: '/guestbook' },
]
