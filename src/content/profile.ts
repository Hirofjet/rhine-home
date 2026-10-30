/* ============================================================
   干员档案 —— Hero 大标题区与「干员档案」区块的数据源
   —— 把下面占位内容换成你自己的信息即可
   ============================================================ */

export interface OperatorProfile {
  /** 代号（英文，显示为 CODENAME） */
  codeName: string
  /** 真实姓名（主页大标题） */
  realName: string
  /** 身份/头衔列表：Hero 区打字机轮流显示 */
  roles: string[]
  /** 一句话简介 */
  intro: string
  /** 档案正文（每项渲染为一段） */
  dossier: string[]
  /** 职业 */
  occupation: string
  /** 所属组织 */
  affiliation: string
  /** 当前状态（STATUS 栏） */
  status: string
  /** 所在地 */
  location: string
  /** 专精方向（标签） */
  specialties: string[]
  /** 特性标签 */
  traits: string[]
  /** 信赖值（0-200，对应明日方舟信赖体系） */
  trust: { value: number; label: string }
}

export const profile: OperatorProfile = {
  codeName: 'RESERVED',
  realName: '你的名字',
  roles: ['干员候补', '前端开发者', '次元探险者', '莱茵生命观察员'],
  intro: '这里是一句话简介：你是什么样的人、正在做什么样的事。',
  dossier: [
    '这里是档案正文第一段。介绍一下你的经历、身份与正在进行的「实验」。',
    '这里是档案正文第二段。写下你的兴趣、能力方向，或者任何你想让来访者知道的事。',
    '所有文字都在 src/content/profile.ts 中修改，页面会自动更新。',
  ],
  occupation: '待定',
  affiliation: '莱茵生命（荣誉编外）',
  status: 'ACTIVE',
  location: 'CN · 某个实验室',
  specialties: ['待填写', '待填写', '待填写'],
  traits: ['二次元', '科技宅', '夜行性'],
  trust: { value: 200, label: '信赖值' },
}
