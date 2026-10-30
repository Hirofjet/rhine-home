/* ============================================================
   能力模块 —— 「能力模块」区块的数据源
   新增一行 = 页面多一张能力卡片；icon 可选值见 AbilityIcon
   ============================================================ */

export type AbilityIcon =
  | 'code'
  | 'design'
  | 'research'
  | 'game'
  | 'data'
  | 'music'

export type AbilityGrade = 'S' | 'A' | 'B'

export interface AbilityModule {
  /** 唯一 id */
  id: string
  /** 模块编号（面板小字） */
  code: string
  /** 模块名（中文） */
  name: string
  /** 模块名（英文小字） */
  nameEn: string
  /** 模块描述 */
  desc: string
  /** 熟练度 0-100 */
  level: number
  /** 评级 */
  grade: AbilityGrade
  /** 图标（对应 lucide 图标映射，见 AbilitiesSection.tsx 的 ICONS） */
  icon: AbilityIcon
}

export const abilityModules: AbilityModule[] = [
  {
    id: 'dev',
    code: 'RL-MD-01',
    name: '前端开发',
    nameEn: 'FRONTEND',
    desc: 'React / TypeScript / 动效实现 —— 待补充描述',
    level: 80,
    grade: 'A',
    icon: 'code',
  },
  {
    id: 'design',
    code: 'RL-MD-02',
    name: '界面设计',
    nameEn: 'UI DESIGN',
    desc: 'Figma / 视觉设计 —— 待补充描述',
    level: 65,
    grade: 'B',
    icon: 'design',
  },
  {
    id: 'research',
    code: 'RL-MD-03',
    name: '情报分析',
    nameEn: 'ANALYSIS',
    desc: '信息检索与归纳 —— 待补充描述',
    level: 70,
    grade: 'A',
    icon: 'research',
  },
  {
    id: 'game',
    code: 'RL-MD-04',
    name: '游戏攻略',
    nameEn: 'GAMING',
    desc: '明日方舟等 —— 待补充描述',
    level: 90,
    grade: 'S',
    icon: 'game',
  },
  {
    id: 'data',
    code: 'RL-MD-05',
    name: '数据整理',
    nameEn: 'DATA',
    desc: '数据处理与可视化 —— 待补充描述',
    level: 55,
    grade: 'B',
    icon: 'data',
  },
  {
    id: 'music',
    code: 'RL-MD-06',
    name: '音乐鉴赏',
    nameEn: 'MUSIC',
    desc: 'OST / 音游 —— 待补充描述',
    level: 75,
    grade: 'A',
    icon: 'music',
  },
]
