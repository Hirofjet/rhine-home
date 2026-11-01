import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { PointerEvent } from 'react'
import { profile, site } from '../../content'
import { useClock } from '../../hooks/useClock'
import { fadeUp, stagger } from '../../lib/motion'
import { CornerFrame, GlowButton, StatusDot, Tag, TypingText } from '../ui'
import type { DotColor } from '../ui/StatusDot'

export function HeroSection() {
  const clock = useClock(site.timezone)
  const reduce = useReducedMotion()

  // 鼠标视差：徽记随指针轻微偏移
  const parallaxX = useMotionValue(0)
  const parallaxY = useMotionValue(0)
  const springX = useSpring(parallaxX, { stiffness: 120, damping: 18, mass: 0.4 })
  const springY = useSpring(parallaxY, { stiffness: 120, damping: 18, mass: 0.4 })

  const handleEmblemMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce) return
    const rect = event.currentTarget.getBoundingClientRect()
    const relX = (event.clientX - rect.left) / rect.width - 0.5
    const relY = (event.clientY - rect.top) / rect.height - 0.5
    parallaxX.set(relX * 16)
    parallaxY.set(relY * 12)
  }

  const resetEmblem = () => {
    parallaxX.set(0)
    parallaxY.set(0)
  }

  const readouts: Array<{ label: string; value: string; dot?: DotColor }> = [
    { label: 'OPERATOR ID', value: site.operatorId },
    { label: 'STATUS', value: profile.status, dot: 'green' },
    { label: 'LOCATION', value: profile.location },
    { label: 'AFFILIATION', value: profile.affiliation },
    { label: 'LOCAL TIME', value: clock, dot: 'cyan' },
  ]

  return (
    <section id="hero" className="relative flex min-h-screen items-center pb-20 pt-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid items-center gap-14 lg:grid-cols-2"
        >
          {/* 左：信息区 */}
          <div>
            <motion.p
              variants={fadeUp}
              className="font-mono text-xs tracking-[0.3em] text-rhine-faint"
            >
              CODENAME //{' '}
              <span className="text-rhine-cyan">{profile.codeName}</span>
            </motion.p>
            <motion.div variants={fadeUp} className="mt-5 flex items-center gap-4">
              <img
                src={`${import.meta.env.BASE_URL}avatar.svg`}
                alt="站长头像"
                className="h-20 w-20 rounded-full border border-rhine-gold/50 object-cover shadow-[0_0_24px_rgb(211_178_122/0.18)]"
              />
              <div className="font-mono text-[10px] leading-relaxed tracking-[0.2em] text-rhine-faint">
                <p className="text-rhine-dim">OPERATOR</p>
                <p>{profile.codeName}</p>
              </div>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-glow-gold mt-3 text-5xl font-bold leading-tight text-rhine-ink sm:text-6xl md:text-7xl"
            >
              {profile.realName}
            </motion.h1>
            <motion.div variants={fadeUp} className="mt-4">
              <TypingText
                words={profile.roles}
                label="身份认证 //"
                className="text-sm tracking-wider sm:text-base"
              />
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-lg text-sm leading-relaxed text-rhine-dim sm:text-base"
            >
              {profile.intro}
            </motion.p>

            {/* 状态读数 */}
            <motion.div
              variants={fadeUp}
              className="mt-7 max-w-md border border-rhine-line/70 bg-rhine-panel/60 p-4 backdrop-blur-sm"
            >
              <div className="space-y-2.5">
                {readouts.map((r) => (
                  <div key={r.label} className="flex items-baseline gap-3">
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.22em] text-rhine-faint">
                      {r.label}
                    </span>
                    <span
                      aria-hidden
                      className="h-px flex-1 translate-y-[-3px] border-b border-dotted border-rhine-line/70"
                    />
                    <span className="flex items-center gap-2 font-mono text-xs text-rhine-ink">
                      {r.dot && <StatusDot color={r.dot} className="scale-75" />}
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 行动按钮 */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <GlowButton to="/#dossier">
                查看个人档案
                <ChevronRight className="h-3.5 w-3.5" />
              </GlowButton>
              <GlowButton to="/#contact" variant="ghost">
                联络终端
              </GlowButton>
              <GlowButton to="/logs" variant="ghost">
                进入日志
              </GlowButton>
            </motion.div>

            {/* 标签 */}
            <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-2">
              {profile.specialties.map((s) => (
                <Tag key={s} tone="gold">
                  ◆ {s}
                </Tag>
              ))}
            </motion.div>
          </div>

          {/* 右：徽记区（鼠标视差） */}
          <motion.div
            variants={fadeUp}
            className="mx-auto w-full max-w-sm"
            onPointerMove={handleEmblemMove}
            onPointerLeave={resetEmblem}
          >
            <motion.div style={{ x: springX, y: springY }}>
              <CornerFrame size={22} className="p-6 sm:p-8">
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border border-rhine-line/70 bg-rhine-panel/60">
                {/* 扫描线纹理 */}
                <div className="pointer-events-none absolute inset-0 scanlines opacity-25" />
                {/* 循环扫描条 */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-14 animate-scan-sweep bg-gradient-to-b from-transparent via-rhine-gold/10 to-transparent"
                />
                {/* 旋转环 */}
                <span
                  aria-hidden
                  className="absolute h-[80%] w-[80%] animate-spin-slower rounded-full border border-dashed border-rhine-gold/40"
                />
                <span
                  aria-hidden
                  className="absolute h-[64%] w-[64%] animate-spin-reverse rounded-full border border-rhine-cyan/30"
                />
                {/* 轨道粒子 */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute h-[80%] w-[80%] animate-spin-slower"
                >
                  <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border border-rhine-gold/80 bg-rhine-gold/40 shadow-[0_0_10px_rgb(211_178_122/0.6)]" />
                  <span className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 rotate-45 border border-rhine-cyan/80 bg-rhine-cyan/40" />
                  <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 border border-rhine-gold/60" />
                </span>
                {/* 六边形 */}
                <svg
                  viewBox="0 0 100 100"
                  className="absolute h-[46%] w-[46%] animate-spin-slower opacity-70"
                  aria-hidden
                >
                  <polygon
                    points="50,2 93,27 93,73 50,98 7,73 7,27"
                    fill="none"
                    stroke="#63d4dc"
                    strokeWidth="1.1"
                  />
                </svg>
                {/* 中心菱形 */}
                <span className="absolute flex h-24 w-24 rotate-45 items-center justify-center border border-rhine-gold/70 bg-rhine-gold/5 shadow-[0_0_36px_rgb(211_178_122/0.18)] sm:h-28 sm:w-28">
                  <span className="text-glow-gold -rotate-45 text-4xl font-bold text-rhine-gold sm:text-5xl">
                    {profile.realName.charAt(0) || '◆'}
                  </span>
                </span>
                {/* 底部状态条 */}
                <div className="absolute inset-x-5 bottom-3.5 flex items-center justify-between font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                  <span className="flex items-center gap-1.5">
                    <StatusDot color="gold" className="scale-75" />
                    {site.operatorId}
                  </span>
                  <span>SEC-CLEARANCE: VISITOR</span>
                </div>
              </div>
            </CornerFrame>
          </motion.div>
          </motion.div>
        </motion.div>

        {/* 滚动提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5"
        >
          <span className="font-mono text-[9px] tracking-[0.35em] text-rhine-faint">
            SCROLL
          </span>
          <ChevronDown className="h-4 w-4 animate-bounce text-rhine-gold" />
        </motion.div>
      </div>
    </section>
  )
}
