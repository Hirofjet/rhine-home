import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Code2,
  Database,
  FlaskConical,
  Gamepad2,
  Music,
  PenTool,
} from 'lucide-react'
import type { AbilityIcon } from '../../content'
import { abilityModules } from '../../content'
import { fadeUp, stagger, viewportOnce } from '../../lib/motion'
import { ProgressBar, SectionTitle } from '../ui'

const ICONS: Record<AbilityIcon, LucideIcon> = {
  code: Code2,
  design: PenTool,
  research: FlaskConical,
  game: Gamepad2,
  data: Database,
  music: Music,
}

export function AbilitiesSection() {
  return (
    <section id="abilities" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle index="02" en="ABILITY MODULES" zh="能力模块" className="flex-1" />
          <span className="hidden font-mono text-[10px] tracking-[0.25em] text-rhine-faint sm:block">
            MODULES: {String(abilityModules.length).padStart(2, '0')}
          </span>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {abilityModules.map((mod) => {
            const Icon = ICONS[mod.icon]
            return (
              <motion.article
                key={mod.id}
                variants={fadeUp}
                className="group relative border border-rhine-line bg-rhine-panel/85 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-rhine-gold/50 hover:shadow-[0_10px_36px_rgb(0_0_0/0.45)]"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-rhine-gold/50"
                />
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center border border-rhine-cyan/40 bg-rhine-cyan/5 text-rhine-cyan transition-all duration-300 group-hover:shadow-[0_0_16px_rgb(99_212_220/0.3)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-xl font-bold text-rhine-gold/90">
                    {mod.grade}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-medium text-rhine-ink">
                    {mod.name}
                  </h3>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                    {mod.code}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
                  {mod.nameEn}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-rhine-dim">
                  {mod.desc}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar
                    value={mod.level}
                    color={mod.grade === 'S' ? 'cyan' : 'gold'}
                    className="flex-1"
                  />
                  <span className="font-mono text-[11px] text-rhine-dim">
                    {mod.level}%
                  </span>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
