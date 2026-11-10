/**
 * 站内法律与备案信息。
 *
 * 备案通过后只需填写以下字段，页脚和 /legal 页面会同步显示；
 * 未填写时保留“待备案通过后填写”的正式占位，不伪造备案号。
 */
export const legal = {
  owner: 'Hirofjet',
  copyrightYear: 2026,
  repository: 'https://github.com/Hirofjet/rhine-home',
  contact: 'https://github.com/Hirofjet',
  complaintEmail: import.meta.env.VITE_COMPLAINT_EMAIL ?? '',
  securityOfficer: import.meta.env.VITE_SECURITY_OFFICER ?? '网站安全负责人',
  complaintPhone: import.meta.env.VITE_COMPLAINT_PHONE ?? '',
  updatedAt: '2026-11-05',
  icp: {
    label: 'ICP 备案号',
    number: import.meta.env.VITE_ICP_NUMBER ?? '',
    authority: '工业和信息化部政务服务平台',
    url: 'https://beian.miit.gov.cn/',
    placeholder: '待备案通过后填写',
  },
  publicSecurity: {
    label: '公安联网备案号',
    number: import.meta.env.VITE_PSB_NUMBER ?? '',
    authority: '全国互联网安全管理服务平台',
    url: 'https://beian.mps.gov.cn/',
    placeholder: '待备案通过后填写',
  },
  filingEntity: {
    label: '备案主体',
    value: 'Hirofjet（个人）',
  },
  accessProvider: {
    label: '接入服务商',
    value: import.meta.env.VITE_ACCESS_PROVIDER ?? '',
    placeholder: '待备案通过后填写',
  },
  approvalDate: {
    label: '备案通过日期',
    value: import.meta.env.VITE_APPROVAL_DATE ?? '',
    placeholder: '待备案通过后填写',
  },
} as const
