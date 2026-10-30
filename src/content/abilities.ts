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
    name: '软件编程',
    nameEn: 'SOFTWARE DEV',
    desc: 'JavaScript / TypeScript / Python / C++ / Java / C#',
    level: 67,
    grade: 'A',
    icon: 'code',
  },
  {
    id: 'design',
    code: 'RL-MD-02',
    name: '媒体设计',
    nameEn: 'MEDIA DESIGN',
    desc: 'Photoshop / Premiere Pro / After Effects',
    level: 66,
    grade: 'A',
    icon: 'design',
  },
  {
    id: 'research',
    code: 'RL-MD-03',
    name: '3D建模',
    nameEn: '3D MODELING',
    desc: 'Blender / Sketchup ',
    level: 50,
    grade: 'B',
    icon: 'research',
  },
  {
    id: 'game',
    code: 'RL-MD-04',
    name: '游戏娱乐',
    nameEn: 'GAMING',
    desc: 'Steam / 原神 / 崩坏:星穹铁道 / 绝区零 / 明日方舟:终末地 / Minecraft / Phigros / Muse Dash / 无畏契约 / CS2 / 碧蓝档案',
    level: 100,
    grade: 'S',
    icon: 'game',
  },
  {
    id: 'data',
    code: 'RL-MD-05',
    name: '数据整理',
    nameEn: 'DATA',
    desc: 'Echarts / Excel / MySQL / 数据可视化 / 数据分析',
    level: 90,
    grade: 'S',
    icon: 'data',
  },
  {
    id: 'music',
    code: 'RL-MD-06',
    name: '音乐鉴赏',
    nameEn: 'MUSIC',
    desc: '术语 / 流行 / 二次元',
    level: 90,
    grade: 'S',
    icon: 'music',
  },
]
