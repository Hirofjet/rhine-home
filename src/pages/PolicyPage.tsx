import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import { legal } from '../content/legal'

const POLICY_VERSION = '2026-11-11'

export function PolicyPage() {
  const { pathname } = useLocation()
  const privacy = pathname.startsWith('/privacy')
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-24 sm:px-6">
      <Link
        to="/legal"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint hover:text-rhine-gold"
      >
        <ArrowLeft className="h-3 w-3" /> 法律与安全
      </Link>
      <header className="mt-5 border-b border-rhine-line/70 pb-5">
        <p className="font-mono text-[10px] tracking-[0.3em] text-rhine-gold">
          {privacy ? 'PRIVACY POLICY' : 'TERMS OF SERVICE'}
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-rhine-ink">
          {privacy ? <ShieldCheck className="h-6 w-6 text-rhine-gold" /> : <FileText className="h-6 w-6 text-rhine-gold" />}
          {privacy ? '隐私政策' : '用户协议'}
        </h1>
        <p className="mt-2 font-mono text-[9px] tracking-wider text-rhine-faint">
          VERSION {POLICY_VERSION} · 生效日期 2026-11-11
        </p>
      </header>

      <article className="mt-6 space-y-6 text-sm leading-7 text-rhine-dim">
        {privacy ? (
          <>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">1. 我们收集什么</h2>
              <p className="mt-2">账号信息（用户名、邮箱、密码哈希）、你主动填写的昵称、头像、简介、性别、生日、标签；你发布的帖子、回复、留言、私信、举报与附件；登录、访问、操作与安全日志。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">2. 使用目的</h2>
              <p className="mt-2">提供账号与内容服务、维护论坛秩序、处理举报投诉、保障系统安全、履行法律法规要求。我们不会出售个人信息，也不会向无关第三方提供。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">3. 公开范围</h2>
              <p className="mt-2">用户名、昵称、头像、简介、标签、公开帖子与留言对访客可见；性别、生日、简介和标签可分别设置「所有人可见 / 好友可见 / 仅自己」；私信仅会话双方可见，举报处理时管理员可在必要范围内查看被举报快照。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">4. 保存期限</h2>
              <p className="mt-2">账号资料保存至账号注销；公开内容保存至删除或注销后的匿名化处理；请求日志 180 天；安全审计日志按安全需要长期保存；法律法规另有要求的除外。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">5. 你的权利</h2>
              <p className="mt-2">你可以访问、更正资料，导出账号数据，申请注销账号；注销后我们将删除或匿名化个人信息，并保留必要的安全日志。你可以在「个人资料 → 隐私与数据」发起相关请求。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">6. 安全措施</h2>
              <p className="mt-2">密码使用 scrypt 哈希；所有用户都可以在个人资料中自行启用 TOTP 动态验证码（默认关闭），管理员同样适用；访问与审计日志用于安全事件追踪；敏感词、举报、屏蔽和紧急停止用于内容治理。互联网不存在绝对安全，请使用独立强密码。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">7. 未成年人</h2>
              <p className="mt-2">未成年人应在监护人同意和指导下使用。监护人可联系我们要求删除相关内容或限制账号。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">8. 联系我们</h2>
              <p className="mt-2">
                安全负责人：{legal.securityOfficer}
                {legal.complaintEmail ? ` · 邮箱：${legal.complaintEmail}` : ''}
                。也可通过
                <Link to="/complaints" className="mx-1 text-rhine-cyan underline underline-offset-2">
                  投诉举报页面
                </Link>
                提交工单。
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">1. 账号</h2>
              <p className="mt-2">你需要提供有效邮箱注册并设置密码。你应对账号下的行为负责，不得出借、出售账号，不得使用自动化手段批量注册或攻击服务。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">2. 发布规范</h2>
              <p className="mt-2">禁止发布违法有害、暴力、色情、诈骗、侵权、隐私泄露、骚扰、仇恨、恶意广告、恶意链接或规避审核的内容。不得冒用他人身份，不得传播恶意软件。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">3. 内容治理</h2>
              <p className="mt-2">普通内容可以直接发布；命中敏感词的内容可能进入人工审核或被拒绝；管理员可对违规内容进行隐藏、删除、限制账号等处置。你可以通过举报/申诉渠道提出异议。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">4. 知识产权</h2>
              <p className="mt-2">你保留自己原创内容的权利，并授权本站为展示、存储、备份和治理目的使用该内容。转载、引用请遵守原作者许可；侵权投诉请通过举报页面提交权属证明。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">5. 服务变更与终止</h2>
              <p className="mt-2">本站为个人非商业站点，可能调整、暂停或终止部分功能。严重违规、攻击系统或危害他人安全时，我们可限制或终止账号，并保留依法报告的权利。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">6. 免责声明</h2>
              <p className="mt-2">本站内容不构成专业建议。第三方链接、用户发布内容和开源素材由其各自权利人负责。我们会尽力维护服务连续性，但不对不可抗力或第三方服务故障作无限担保。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">7. 协议更新</h2>
              <p className="mt-2">协议更新后会在本页公布版本号；继续使用视为接受更新内容。重大变更会通过站内公告或登录提示告知。</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-rhine-ink">8. 联系方式</h2>
              <p className="mt-2">
                投诉与申诉：
                <Link to="/complaints" className="mx-1 text-rhine-cyan underline underline-offset-2">
                  投诉举报页面
                </Link>
                {legal.complaintEmail ? ` · ${legal.complaintEmail}` : ''}
              </p>
            </section>
          </>
        )}
      </article>
    </main>
  )
}
