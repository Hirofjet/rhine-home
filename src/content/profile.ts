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
  /** 信赖值（0-200） */
  trust: { value: number; label: string }
}

export const profile: OperatorProfile = {
  codeName: 'Hirofjet',
  realName: '菲羽猫',
  roles: ['技术宅男', '科技数码爱好者', '开拓者', '旅行者' ,'管理员' ,'绳匠', '二次元爱好者', '喵星人'],
  intro: '我是一只伪装成人的喵星人，我喜欢人类的科技、数码、二次元。这是本猫的主页喵~',
  dossier: [
    '吾名菲羽猫,喵星第一的魔法师兼爆裂魔法的操纵者兼邪王真眼的拥有者,好好见识我的力量吧!Explosion!',
    '数码区的神，科技区的鬼，人世间的猫。',
    '喜欢模仿社畜人类程序员敲代码。',
  ],
  occupation: '人类学生伪装员',
  affiliation: '洛琪希神教',
  status: '薛定谔态',
  location: 'CN · HangZhou',
  specialties: ['大数据运维', '软件编程', '睡觉'],
  traits: ['二次元', '科技宅', '夜行性'],
  trust: { value: 100, label: '信赖值' },
}
