import { motion } from 'framer-motion'
import { useSiteHomeContent } from '../../hooks/useSiteHomeContent'
import { fadeUp, viewportOnce } from '../../lib/motion'
import { Barcode, Panel, ProgressBar, SectionTitle, Tag } from '../ui'

export function DossierSection() {
  const content = useSiteHomeContent()
  const data = content.profile
  if (!data) {
    return (
      <section id="dossier" className="relative py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle index="01" en="PERSONNEL FILE" zh="个人档案" />
          <div className="mt-10 border border-dashed border-rhine-line/70 px-5 py-10 text-center font-mono text-[11px] tracking-wider text-rhine-faint">
            资料暂不可用，请检查网络后重试
          </div>
        </div>
      </section>
    )
  }
  const rows = [
    { label: '代号', value: data.codeName },
    { label: '真名', value: data.realName },
    { label: '职业', value: data.occupation },
    { label: '所属', value: data.affiliation },
    { label: '状态', value: data.status },
    { label: '所在地', value: data.location },
  ]
  const trustPct = 0

  return (
    <section id="dossier" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle index="01" en="PERSONNEL FILE" zh="个人档案" />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          {/* 基础信息 + 标签 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <Panel
              code="RL-01"
              title="BASIC INFO"
              titleZh="基础信息"
              right={<Barcode className="hidden h-3 opacity-40 sm:flex" />}
            >
              <dl className="space-y-4">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-baseline gap-3">
                    <dt className="w-16 shrink-0 text-sm text-rhine-dim">
                      {row.label}
                    </dt>
                    <span
                      aria-hidden
                      className="h-px flex-1 translate-y-[-3px] border-b border-dotted border-rhine-line/60"
                    />
                    <dd className="font-mono text-xs tracking-wider text-rhine-ink">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel className="mt-6" code="RL-03" title="TAGS" titleZh="特性标签">
              <div className="flex flex-wrap gap-2">
                {data.traits.map((t) => (
                  <Tag key={t} tone="cyan">
                    # {t}
                  </Tag>
                ))}
              </div>
            </Panel>
          </motion.div>

          {/* 档案记录 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <Panel
              code="RL-02"
              title="DOSSIER"
              titleZh="档案记录"
              accent="cyan"
              className="h-full"
            >
              <div className="space-y-4 text-sm leading-relaxed text-rhine-dim">
                {data.dossier.map((paragraph, i) => (
                  <p key={i} className="flex gap-3">
                    <span className="shrink-0 font-mono text-[11px] leading-6 text-rhine-gold">
                      ▍{String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{paragraph}</span>
                  </p>
                ))}
              </div>

              {/* 信赖值 */}
              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between font-mono text-[11px] tracking-[0.2em]">
                  <span className="text-rhine-faint">
                    TRUST
                  </span>
                  <span className="text-rhine-gold">
                    0 / 200
                  </span>
                </div>
                <ProgressBar value={trustPct} color="gold" />
              </div>

              {/* 专精 */}
              <div className="mt-7">
                <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-rhine-faint">
                  SPECIALTY · 专精方向
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.specialties.map((s) => (
                    <Tag key={s} tone="gold">
                      ◆ {s}
                    </Tag>
                  ))}
                </div>
              </div>
            </Panel>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
