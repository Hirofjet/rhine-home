import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Scale, ShieldCheck } from 'lucide-react'
import { legal } from '../content/legal'

const THIRD_PARTY = [
  ['RhineLabUI', 'LBEILC', 'MIT', '3D Lab 原始场景、模型、动画、环境音'],
  ['PR #15', 'PacificSauryMan / OpenAI Codex', '随上游仓库', 'Web 场景性能优化参考与适配'],
  ['React', 'Meta', 'MIT', '前端 UI 运行时'],
  ['Vite', 'Vite contributors', 'MIT', '构建与开发服务器'],
  ['Tailwind CSS', 'Tailwind Labs', 'MIT', '样式工具'],
  ['Express', 'Express contributors', 'MIT', '后端 HTTP 服务'],
  ['ECharts', 'Apache Software Foundation', 'Apache-2.0', '后台数据可视化'],
  ['Three.js', 'Three.js authors', 'MIT', '3D 渲染'],
  ['marked', 'Marked contributors', 'MIT', 'Markdown 解析'],
  ['DOMPurify', 'Cure53', 'MPL-2.0 / Apache-2.0', 'HTML 安全清理'],
  ['Framer Motion', 'Framer', 'MIT', '界面动效'],
  ['Lucide', 'Lucide contributors', 'ISC', '图标'],
]

export function LegalPage() {
  const icpNumber = legal.icp.number || legal.icp.placeholder
  const policeNumber = legal.publicSecurity.number || legal.publicSecurity.placeholder

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint hover:text-rhine-gold"
      >
        <ArrowLeft className="h-3 w-3" /> 返回主页
      </Link>

      <header className="mt-6 border-b border-rhine-line/70 pb-5">
        <p className="font-mono text-[10px] tracking-[0.3em] text-rhine-gold">LEGAL / COMPLIANCE</p>
        <h1 className="mt-2 text-3xl font-bold text-rhine-ink">法律、版权与开源声明</h1>
        <p className="mt-2 text-sm leading-relaxed text-rhine-dim">
          本站为个人非商业性质的作品展示与交流站点。以下说明本站原创内容、第三方开源代码与素材的权属边界，以及备案信息预留位。
        </p>
        <p className="mt-2 font-mono text-[9px] tracking-wider text-rhine-faint">
          LAST UPDATED {legal.updatedAt}
        </p>
      </header>

      <div className="mt-6 space-y-5">
        <article className="border border-rhine-line/70 bg-rhine-panel/30 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-rhine-ink">
            <Scale className="h-4 w-4 text-rhine-gold" /> 个人版权信息
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-rhine-dim">
            <p>
              © {legal.copyrightYear} {legal.owner}. 除另有注明外，本站的原创代码、界面设计、信息编排与原创文字内容的著作权归{' '}
              <strong className="text-rhine-ink">{legal.owner}</strong> 所有。
            </p>
            <p>
              未经权利人书面许可，不得将本站原创部分用于商业再发布、批量抓取、售卖或以其他方式侵犯著作权。个人学习、研究和非商业引用请保留出处与本站链接。
            </p>
            <p>
              本站使用的第三方开源代码、字体、图标、光标、模型、场景与音频不因本站代码开放而改变其原始许可；相关权利归各自权利人所有。
            </p>
          </div>
        </article>

        <article className="border border-rhine-line/70 bg-rhine-panel/30 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-rhine-ink">
            <ShieldCheck className="h-4 w-4 text-rhine-gold" /> 开源代码使用声明
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-rhine-dim">
            <p>
              本站基于 React、Vite、TypeScript、Tailwind CSS、Express 等开源项目构建。各依赖按其原始许可证使用，本项目不主张对第三方代码拥有著作权。
            </p>
            <p>
              3D Lab 的原始视觉、场景、模型、动画与环境音来自{' '}
              <a
                className="text-rhine-cyan underline underline-offset-2"
                href="https://github.com/LBEILC/RhineLabUI"
                target="_blank"
                rel="noopener noreferrer"
              >
                LBEILC / RhineLabUI
              </a>{' '}
              的 MIT 许可项目。性能优化参考 PR #15（PacificSauryMan，适配整理由 OpenAI Codex 协助）。再分发时必须保留原作者署名、LICENSE 与修改说明。
            </p>
            <p>
              MiSans 字体版权归小米/原作者所有；Blue Archive 相关光标、图标与参考素材仅用于个人非商业展示，相关权利归原权利方。本站与上海鹰角网络、Blue Archive 权利方无隶属、授权或商业合作关系。
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-rhine-line/70 font-mono text-[9px] tracking-wider text-rhine-faint">
                  <th className="py-2 pr-3">项目 / 素材</th>
                  <th className="py-2 pr-3">作者 / 权利人</th>
                  <th className="py-2 pr-3">许可</th>
                  <th className="py-2">本站用途</th>
                </tr>
              </thead>
              <tbody>
                {THIRD_PARTY.map(([name, author, license, usage]) => (
                  <tr key={name} className="border-b border-rhine-line/35 text-rhine-dim">
                    <td className="py-2 pr-3 text-rhine-ink">{name}</td>
                    <td className="py-2 pr-3">{author}</td>
                    <td className="py-2 pr-3 font-mono text-[10px] text-rhine-cyan">{license}</td>
                    <td className="py-2">{usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 font-mono text-[9px] leading-6 tracking-wider text-rhine-faint">
            仓库：{' '}
            <a
              href={legal.repository}
              className="text-rhine-cyan underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {legal.repository}
            </a>
          </p>
        </article>

        <article className="border border-rhine-line/70 bg-rhine-panel/30 p-5">
          <h2 className="text-lg font-bold text-rhine-ink">网站备案信息（预留）</h2>
          <p className="mt-2 text-sm leading-7 text-rhine-dim">
            以下为备案申请通过后的正式信息位置。当前未取得备案号，页面显示占位文字，不伪造、不冒用任何备案编号。
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="border border-rhine-line/50 p-3">
              <dt className="font-mono text-[9px] tracking-wider text-rhine-faint">{legal.icp.label}</dt>
              <dd className="mt-1 text-rhine-ink">
                {legal.icp.number ? (
                  <a
                    href={legal.icp.url}
                    className="text-rhine-cyan underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {icpNumber}
                  </a>
                ) : (
                  <span className="text-rhine-dim">{icpNumber}</span>
                )}
              </dd>
            </div>
            <div className="border border-rhine-line/50 p-3">
              <dt className="font-mono text-[9px] tracking-wider text-rhine-faint">
                {legal.publicSecurity.label}
              </dt>
              <dd className="mt-1 text-rhine-dim">{policeNumber}</dd>
            </div>
            <div className="border border-rhine-line/50 p-3">
              <dt className="font-mono text-[9px] tracking-wider text-rhine-faint">
                {legal.filingEntity.label}
              </dt>
              <dd className="mt-1 text-rhine-ink">{legal.filingEntity.value}</dd>
            </div>
            <div className="border border-rhine-line/50 p-3">
              <dt className="font-mono text-[9px] tracking-wider text-rhine-faint">
                {legal.accessProvider.label}
              </dt>
              <dd className="mt-1 text-rhine-dim">
                {legal.accessProvider.value || legal.accessProvider.placeholder}
              </dd>
            </div>
            <div className="border border-rhine-line/50 p-3 sm:col-span-2">
              <dt className="font-mono text-[9px] tracking-wider text-rhine-faint">
                {legal.approvalDate.label}
              </dt>
              <dd className="mt-1 text-rhine-dim">
                {legal.approvalDate.value || legal.approvalDate.placeholder}
              </dd>
            </div>
          </dl>
          <p className="mt-3 font-mono text-[9px] leading-6 tracking-wider text-rhine-faint">
            备案信息填写位置：<code>src/content/legal.ts</code>。通过后填写备案号、接入商与日期即可自动展示。
          </p>
        </article>

        <article className="border border-rhine-line/70 bg-rhine-panel/30 p-5">
          <h2 className="text-lg font-bold text-rhine-ink">隐私与联系</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-rhine-dim">
            <p>
              本站仅为账号、内容发布、论坛交流与访问记录处理必要数据；不主动出售或向无关第三方提供个人信息。上传文件与数据库由站点运营者自行备份和保管。
            </p>
            <p>
              版权异议、素材移除请求或数据问题，请通过{' '}
              <a
                href={legal.contact}
                className="text-rhine-cyan underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Issues
              </a>{' '}
              联系站点运营者。
            </p>
          </div>
        </article>
      </div>

      <p className="mt-6 flex items-center gap-2 font-mono text-[9px] tracking-wider text-rhine-faint">
        <ExternalLink className="h-3 w-3" /> 本页为站内法律信息入口，不构成法律意见。
      </p>
    </section>
  )
}
