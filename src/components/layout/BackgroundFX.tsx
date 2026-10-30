/* 全站背景特效：网格 + 扫描线 + 漂浮菱形 + 大型几何装饰 */

const DIAMONDS: Array<{
  left: string
  top: string
  size: number
  delay: string
  dur: string
  color: string
}> = [
  { left: '6%', top: '20%', size: 8, delay: '0s', dur: '7s', color: 'border-rhine-gold/40' },
  { left: '88%', top: '14%', size: 6, delay: '1.2s', dur: '9s', color: 'border-rhine-cyan/40' },
  { left: '14%', top: '62%', size: 5, delay: '0.6s', dur: '8s', color: 'border-rhine-cyan/30' },
  { left: '82%', top: '48%', size: 9, delay: '2s', dur: '10s', color: 'border-rhine-gold/25' },
  { left: '28%', top: '86%', size: 6, delay: '1.6s', dur: '7.5s', color: 'border-rhine-cyan/25' },
  { left: '68%', top: '80%', size: 5, delay: '0.3s', dur: '8.5s', color: 'border-rhine-gold/35' },
  { left: '42%', top: '8%', size: 4, delay: '2.6s', dur: '9.5s', color: 'border-rhine-gold/30' },
  { left: '76%', top: '30%', size: 4, delay: '1s', dur: '7s', color: 'border-rhine-cyan/30' },
  { left: '8%', top: '40%', size: 4, delay: '3s', dur: '8s', color: 'border-rhine-gold/30' },
  { left: '94%', top: '70%', size: 7, delay: '0.9s', dur: '9s', color: 'border-rhine-cyan/35' },
]

export function BackgroundFX() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-rhine-abyss"
    >
      {/* 顶部光晕 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgb(99_212_220/0.07),transparent_70%)]" />
      {/* 底部光晕 */}
      <div className="absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_70%_60%_at_50%_110%,rgb(211_178_122/0.06),transparent_70%)]" />
      {/* 数据网格 */}
      <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
      {/* CRT 扫描线 */}
      <div className="absolute inset-0 scanlines opacity-30" />
      {/* 顶部中央光束 */}
      <div className="absolute left-1/2 top-0 h-48 w-px -translate-x-1/2 bg-gradient-to-b from-rhine-gold/50 to-transparent" />

      {/* 大型几何装饰 */}
      <svg
        viewBox="0 0 100 100"
        className="absolute -right-20 top-14 h-[400px] w-[400px] animate-spin-slower opacity-[0.08]"
      >
        <polygon
          points="50,2 93,27 93,73 50,98 7,73 7,27"
          fill="none"
          stroke="#63d4dc"
          strokeWidth="0.8"
        />
      </svg>
      <div className="absolute -left-24 bottom-16 h-72 w-72 rotate-45 animate-spin-slower border border-rhine-gold/15" />
      <div className="absolute -left-16 bottom-24 h-72 w-72 rotate-45 border border-rhine-gold/10" />

      {/* 漂浮菱形粒子 */}
      {DIAMONDS.map((d, i) => (
        <span
          key={i}
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
            animationDuration: d.dur,
          }}
          className={`absolute rotate-45 border ${d.color} animate-float-y`}
        />
      ))}

      {/* 底部渐隐 */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-rhine-abyss to-transparent" />
    </div>
  )
}
