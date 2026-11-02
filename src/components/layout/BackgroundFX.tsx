import { useTheme } from '../theme/ThemeProvider'

const RHINE_DIAMONDS: Array<{ left: string; top: string; size: number; delay: string; dur: string }> = [
  { left: '6%', top: '20%', size: 8, delay: '0s', dur: '7s' },
  { left: '88%', top: '14%', size: 6, delay: '1.2s', dur: '9s' },
  { left: '14%', top: '62%', size: 5, delay: '0.6s', dur: '8s' },
  { left: '82%', top: '48%', size: 9, delay: '2s', dur: '10s' },
  { left: '28%', top: '86%', size: 6, delay: '1.6s', dur: '7.5s' },
  { left: '68%', top: '80%', size: 5, delay: '0.3s', dur: '8.5s' },
  { left: '42%', top: '8%', size: 4, delay: '2.6s', dur: '9.5s' },
  { left: '76%', top: '30%', size: 4, delay: '1s', dur: '7s' },
  { left: '8%', top: '40%', size: 4, delay: '3s', dur: '8s' },
  { left: '94%', top: '70%', size: 7, delay: '0.9s', dur: '9s' },
]

const PETALS = Array.from({ length: 14 }, (_, index) => ({
  left: `${4 + ((index * 7.3) % 92)}%`,
  size: 5 + (index % 4) * 2,
  delay: `${(index * 1.7) % 14}s`,
  duration: `${13 + (index % 5) * 2.4}s`,
  opacity: 0.25 + (index % 4) * 0.12,
}))

function RhineLayers() {
  return (
    <>
      <div className="absolute inset-0 bg-theme-rhine" />
      <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_28%,transparent_80%)]" />
      <svg
        viewBox="0 0 100 100"
        className="absolute -right-20 top-14 h-[420px] w-[420px] animate-spin-slower opacity-[0.09]"
        aria-hidden
      >
        <polygon
          points="50,2 93,27 93,73 50,98 7,73 7,27"
          fill="none"
          stroke="var(--color-rhine-cyan)"
          strokeWidth="0.55"
        />
        <polygon
          points="50,12 84,31 84,69 50,88 16,69 16,31"
          fill="none"
          stroke="var(--color-rhine-gold)"
          strokeWidth="0.3"
          strokeDasharray="1.5 2.4"
        />
      </svg>
      <div className="absolute -left-24 bottom-16 h-72 w-72 rotate-45 animate-spin-slower border border-rhine-gold/15" />
      <div className="absolute -left-16 bottom-24 h-72 w-72 rotate-45 border border-rhine-gold/10" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-30%] top-[28%] h-px w-[150%] rotate-[-18deg] animate-beam bg-gradient-to-r from-transparent via-rhine-cyan/20 to-transparent" />
        <div
          className="absolute left-[-20%] top-[64%] h-px w-[140%] rotate-[14deg] animate-beam bg-gradient-to-r from-transparent via-rhine-gold/15 to-transparent"
          style={{ animationDelay: '-12s' }}
        />
      </div>
      {RHINE_DIAMONDS.map((diamond, index) => (
        <span
          key={index}
          style={{
            left: diamond.left,
            top: diamond.top,
            width: diamond.size,
            height: diamond.size,
            animationDelay: diamond.delay,
            animationDuration: diamond.dur,
          }}
          className={`absolute rotate-45 border ${
            index % 2 === 0 ? 'border-rhine-gold/35' : 'border-rhine-cyan/35'
          } animate-float-y`}
        />
      ))}
    </>
  )
}

function ArchiveLayers() {
  return (
    <>
      <div className="absolute inset-0 bg-theme-archive" />
      <div className="theme-grid-archive absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_86%)]" />
      <svg
        viewBox="0 0 100 100"
        className="absolute -right-28 -top-24 h-[520px] w-[520px] animate-spin-slower opacity-30"
        aria-hidden
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-rhine-gold)" strokeWidth="0.25" />
        <circle
          cx="50"
          cy="50"
          r="37"
          fill="none"
          stroke="var(--color-rhine-cyan)"
          strokeWidth="0.4"
          strokeDasharray="2 3"
        />
        <circle cx="50" cy="50" r="24" fill="none" stroke="var(--color-rhine-gold)" strokeWidth="0.2" />
        <path d="M50 1v10M50 89v10M1 50h10M89 50h10" stroke="var(--color-rhine-cyan)" strokeWidth="0.5" />
      </svg>
      <svg
        viewBox="0 0 100 100"
        className="absolute -bottom-32 -left-24 h-[430px] w-[430px] animate-spin-reverse opacity-20"
        aria-hidden
      >
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-rhine-cyan)" strokeWidth="0.35" />
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="var(--color-rhine-gold)"
          strokeWidth="0.25"
          strokeDasharray="0.8 2"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[-18%] top-[24%] h-40 w-[140%] rotate-[-16deg] blur-2xl"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-rhine-gold) 10%, transparent), transparent)',
          }}
        />
        <div
          className="absolute left-[-24%] top-[70%] h-32 w-[150%] rotate-[12deg] blur-2xl"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-rhine-cyan) 9%, transparent), transparent)',
          }}
        />
      </div>
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          className="absolute animate-float-y border border-rhine-gold/25 bg-rhine-gold/[0.06]"
          style={{
            left: `${6 + ((index * 11.7) % 88)}%`,
            top: `${8 + ((index * 17.3) % 78)}%`,
            width: 3 + (index % 3) * 2,
            height: 3 + (index % 3) * 2,
            animationDelay: `${(index * 0.9) % 7}s`,
            animationDuration: `${7 + (index % 4)}s`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-20 flex justify-center">
        <span className="font-mono text-[8px] tracking-[0.65em] text-rhine-gold/20">
          MILLENNIUM // SENSEI
        </span>
      </div>
    </>
  )
}

function SakuraLayers() {
  return (
    <>
      <div className="absolute inset-0 bg-theme-sakura" />
      <div className="theme-grid-sakura absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_82%)]" />
      <div className="absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-rhine-gold/[0.08] blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-[380px] w-[380px] rounded-full bg-rhine-cyan/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PETALS.map((petal, index) => (
          <span
            key={index}
            className="absolute top-0 animate-petal-fall rounded-[80%_0_80%_0]"
            style={{
              left: petal.left,
              width: petal.size,
              height: petal.size * 0.72,
              opacity: petal.opacity,
              backgroundColor: index % 3 === 0 ? 'var(--color-rhine-cyan)' : 'var(--color-rhine-gold)',
              animationDelay: petal.delay,
              animationDuration: petal.duration,
              filter: 'blur(0.2px)',
            }}
          />
        ))}
      </div>
      <svg
        viewBox="0 0 100 100"
        className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 animate-spin-slower opacity-[0.06]"
        aria-hidden
      >
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-rhine-gold)" strokeWidth="0.25" />
        <circle
          cx="50"
          cy="50"
          r="28"
          fill="none"
          stroke="var(--color-rhine-cyan)"
          strokeWidth="0.3"
          strokeDasharray="0.8 2.6"
        />
      </svg>
      <div className="absolute left-8 top-28 font-mono text-[8px] tracking-[0.5em] text-rhine-gold/25">
        SAKURA // PROTOCOL
      </div>
    </>
  )
}

export function BackgroundFX() {
  const { theme } = useTheme()
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-rhine-abyss"
    >
      {theme === 'rhine' && <RhineLayers />}
      {theme === 'archive' && <ArchiveLayers />}
      {theme === 'sakura' && <SakuraLayers />}

      <div className="absolute inset-0 scanlines opacity-[0.18]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rhine-abyss/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-rhine-abyss/80 to-transparent" />
    </div>
  )
}
