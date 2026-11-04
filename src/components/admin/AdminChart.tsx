import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useTheme } from '../theme/ThemeProvider'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
])

interface AdminChartProps {
  option: EChartsOption
  height?: number | string
  className?: string
  empty?: boolean
}

function cssColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function AdminChart({ option, height = 220, className = '', empty = false }: AdminChartProps) {
  const host = useRef<HTMLDivElement | null>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const element = host.current
    if (!element) return undefined
    const instance = echarts.init(element, undefined, { renderer: 'canvas' })
    chart.current = instance
    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(element)
    return () => {
      observer.disconnect()
      instance.dispose()
      chart.current = null
    }
  }, [theme])

  useEffect(() => {
    if (!chart.current) return
    const gold = cssColor('--color-rhine-gold', '#c5a16b')
    const cyan = cssColor('--color-rhine-cyan', '#63d4dc')
    const green = cssColor('--color-rhine-green', '#79b97a')
    const red = cssColor('--color-rhine-red', '#c96b6b')
    const ink = cssColor('--color-rhine-ink', '#e8e4dc')
    const dim = cssColor('--color-rhine-dim', '#8d887c')
    const line = cssColor('--color-rhine-line', '#4b4a42')
    const panel = cssColor('--color-rhine-panel', '#1b1d1a')
    chart.current.setOption(
      {
        color: [gold, cyan, green, red, '#9a86ff', '#d988b9'],
        backgroundColor: 'transparent',
        textStyle: { color: dim, fontFamily: 'Rajdhani, sans-serif' },
        animationDuration: 550,
        animationEasing: 'cubicOut',
        ...option,
        tooltip: {
          backgroundColor: panel,
          borderColor: line,
          textStyle: { color: ink, fontSize: 11 },
          ...(option.tooltip as object),
        },
        legend: option.legend
          ? {
              textStyle: { color: dim, fontSize: 10 },
              ...(option.legend as object),
            }
          : undefined,
      } as EChartsOption,
      true,
    )
  }, [option, theme])

  useEffect(() => {
    if (!chart.current || !empty) return
    chart.current.setOption({
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'middle',
        textStyle: {
          color: cssColor('--color-rhine-faint', '#77736a'),
          fontSize: 11,
          fontWeight: 400,
        },
      },
    })
  }, [empty, theme])

  return (
    <div
      ref={host}
      className={className}
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
    />
  )
}
