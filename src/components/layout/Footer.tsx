import { ArrowUp, Diamond } from 'lucide-react'
import { Link } from 'react-router-dom'
import { moduleLinks, navItems, site } from '../../content'
import { Barcode } from '../ui'

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-rhine-line bg-rhine-abyss/90">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* 站点信息 */}
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center border border-rhine-gold/60 bg-rhine-gold/5">
                <Diamond className="h-4 w-4 text-rhine-gold" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-sm font-medium tracking-[0.18em] text-rhine-ink">
                  {site.title}
                </span>
                <span className="mt-1 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                  {site.titleSub}
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm text-rhine-dim">{site.slogan}</p>
            <Barcode className="mt-5 max-w-[220px]" />
          </div>

          {/* 链接矩阵 */}
          <div className="grid grid-cols-2 gap-10">
            <nav aria-label="页脚-区块导航">
              <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-rhine-gold">
                SECTIONS
              </p>
              <ul className="space-y-2.5">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="text-sm text-rhine-dim transition-colors hover:text-rhine-gold"
                    >
                      {item.label}
                      <span className="ml-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                        {item.labelEn}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="页脚-模块导航">
              <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-rhine-gold">
                MODULES
              </p>
              <ul className="space-y-2.5">
                {moduleLinks.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="text-sm text-rhine-dim transition-colors hover:text-rhine-cyan"
                    >
                      {item.label}
                      <span className="ml-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                        {item.labelEn}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* 回到顶部 */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex h-11 w-11 items-center justify-center border border-rhine-line text-rhine-dim transition-all duration-300 hover:border-rhine-gold/70 hover:text-rhine-gold hover:shadow-[0_0_18px_rgb(211_178_122/0.25)]"
            aria-label="回到顶部"
          >
            <ArrowUp className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </button>
        </div>

        {/* 小字声明 */}
        <div className="mt-10 space-y-2 border-t border-rhine-line/60 pt-6 font-mono text-[10px] leading-relaxed tracking-wider text-rhine-faint">
          <p>
            © {YEAR} {site.footer.line1}
          </p>
          <p>{site.footer.line2}</p>
          <p className="text-rhine-gold-deep">
            {site.footer.builtWith} · ARKNIGHTS RHINE LAB TRIBUTE
          </p>
        </div>
      </div>
    </footer>
  )
}
