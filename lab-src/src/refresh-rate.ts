let detectedHz = 0
let measuring = false

const COMMON = [60, 75, 90, 100, 120, 144, 165, 180, 240]

function normalize(hz: number) {
  const nearest = COMMON.reduce((best, value) =>
    Math.abs(value - hz) < Math.abs(best - hz) ? value : best,
  )
  return Math.abs(nearest - hz) <= 2 ? nearest : Math.round(hz)
}

/** Measure the display refresh rate from rAF timestamps. rAF is already
 * vsync-locked; this lets the HUD and adaptive renderer use the real target
 * instead of assuming 60Hz. */
export function startRefreshRateDetection() {
  if (measuring) return
  measuring = true
  let last = 0
  const samples: number[] = []
  const tick = (now: number) => {
    if (last) {
      const delta = now - last
      if (delta > 3 && delta < 45) samples.push(delta)
      if (samples.length >= 36) {
        const sorted = [...samples].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        detectedHz = normalize(1000 / median)
        document.documentElement.dataset.refreshRate = String(detectedHz)
        measuring = false
        return
      }
    }
    last = now
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function getRefreshRate() {
  return detectedHz
}
