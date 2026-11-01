/* oxlint-disable react/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1900
const pad = (value: string | number) => String(value).padStart(2, '0')

const parse = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return {
    year: match[1],
    month: String(Number(match[2])),
    day: String(Number(match[3])),
  }
}

const daysInMonth = (year: number, month: number) => {
  if (year < MIN_YEAR || month < 1 || month > 12) return 31
  return new Date(year, month, 0).getDate()
}

const normalizeYear = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (!digits) return ''
  let number = Number(digits)
  if (digits.length === 1 || digits.length === 2) {
    number =
      number <= CURRENT_YEAR % 100 ? 2000 + number : 1900 + number
  }
  return String(Math.min(CURRENT_YEAR, Math.max(MIN_YEAR, number)))
}

interface BirthdayPickerProps {
  value: string
  onChange: (value: string) => void
}

/**
 * 生日选择：年份直接输入（支持 98 / 05 简写），月份、日期用下拉。
 * 避免原生日期控件需要逐月翻页的问题。
 */
export function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  const initial = parse(value)
  const [year, setYear] = useState(initial?.year ?? '')
  const [month, setMonth] = useState(initial?.month ?? '')
  const [day, setDay] = useState(initial?.day ?? '')
  const [yearError, setYearError] = useState('')

  // 外部值变化（保存成功 / 数据刷新）时同步
  useEffect(() => {
    const parsed = parse(value)
    setYear(parsed?.year ?? '')
    setMonth(parsed?.month ?? '')
    setDay(parsed?.day ?? '')
    setYearError('')
  }, [value])

  const dayCount = useMemo(
    () => daysInMonth(Number(year), Number(month) || 1),
    [year, month],
  )

  const emit = (nextYear: string, nextMonth: string, nextDay: string) => {
    if (
      nextYear.length === 4 &&
      Number(nextYear) >= MIN_YEAR &&
      Number(nextYear) <= CURRENT_YEAR &&
      nextMonth &&
      nextDay
    ) {
      onChange(`${nextYear}-${pad(nextMonth)}-${pad(nextDay)}`)
    }
  }

  const applyYear = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    setYear(digits)
    setYearError('')
    const nextMax = daysInMonth(Number(digits), Number(month) || 1)
    const nextDay = day && Number(day) > nextMax ? String(nextMax) : day
    if (nextDay !== day) setDay(nextDay)
    emit(digits, month, nextDay)
  }

  const commitYear = () => {
    if (!year) return
    const normalized = normalizeYear(year)
    if (normalized.length !== 4) {
      setYearError(`年份需在 ${MIN_YEAR} - ${CURRENT_YEAR} 之间`)
      return
    }
    setYear(normalized)
    const nextMax = daysInMonth(Number(normalized), Number(month) || 1)
    const nextDay = day && Number(day) > nextMax ? String(nextMax) : day
    if (nextDay !== day) setDay(nextDay)
    emit(normalized, month, nextDay)
  }

  const applyMonth = (nextMonth: string) => {
    setMonth(nextMonth)
    const nextMax = daysInMonth(Number(year), Number(nextMonth) || 1)
    const nextDay = day && Number(day) > nextMax ? String(nextMax) : day
    if (nextDay !== day) setDay(nextDay)
    emit(year, nextMonth, nextDay)
  }

  const applyDay = (nextDay: string) => {
    setDay(nextDay)
    emit(year, month, nextDay)
  }

  const clear = () => {
    setYear('')
    setMonth('')
    setDay('')
    setYearError('')
    onChange('')
  }

  const preview =
    year.length === 4 && month && day
      ? `${year} 年 ${pad(month)} 月 ${pad(day)} 日`
      : '填写年份、月份和日期'

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
        <label className="block space-y-1">
          <span className="font-mono text-[9px] tracking-[0.18em] text-rhine-faint">年</span>
          <input
            inputMode="numeric"
            value={year}
            onChange={(event) => applyYear(event.target.value)}
            onBlur={commitYear}
            placeholder="1998"
            maxLength={4}
            aria-label="出生年份"
            className="w-full border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-xs text-rhine-ink outline-none placeholder:text-rhine-faint focus:border-rhine-gold/60"
          />
        </label>
        <label className="block space-y-1">
          <span className="font-mono text-[9px] tracking-[0.18em] text-rhine-faint">月</span>
          <select
            value={month}
            onChange={(event) => applyMonth(event.target.value)}
            aria-label="出生月份"
            className="w-full border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
          >
            <option value="">月</option>
            {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((item) => (
              <option key={item} value={item}>
                {item} 月
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-mono text-[9px] tracking-[0.18em] text-rhine-faint">日</span>
          <select
            value={day}
            onChange={(event) => applyDay(event.target.value)}
            aria-label="出生日期"
            className="w-full border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
          >
            <option value="">日</option>
            {Array.from({ length: dayCount }, (_, index) => String(index + 1)).map((item) => (
              <option key={item} value={item}>
                {item} 日
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[9px] tracking-wider text-rhine-faint">
          {yearError || preview}
        </p>
        <button
          type="button"
          onClick={clear}
          className="font-mono text-[9px] tracking-wider text-rhine-faint underline-offset-2 hover:text-rhine-red hover:underline"
        >
          清除生日
        </button>
      </div>
      <p className="font-mono text-[9px] tracking-wider text-rhine-faint">
        年份可直接输入，支持 98 / 05 简写；日期会随月份和闰年自动调整。
      </p>
    </div>
  )
}
