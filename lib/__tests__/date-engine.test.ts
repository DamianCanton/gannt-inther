import { describe, expect, it } from 'vitest'

import {
  addWorkingDays,
  countWorkingDays,
  isHoliday,
  isWeekend,
  isWorkingDay,
  nextWorkingDay,
  toUtcDateOnly,
} from '@/lib/date-engine'

describe('date-engine', () => {
  it('normalizes date strings to UTC date-only', () => {
    const result = toUtcDateOnly('2026-04-03')

    expect(result.toISOString()).toBe('2026-04-03T00:00:00.000Z')
  })

  it('detects weekends and holidays', () => {
    const holidays = new Set(['2026-04-06'])

    expect(isWeekend('2026-04-04')).toBe(true) // Saturday
    expect(isHoliday('2026-04-06', holidays)).toBe(true)
    expect(isWorkingDay('2026-04-07', holidays)).toBe(true)
  })

  it('adds working days skipping weekend and holiday (Friday + 2 with Monday holiday = Tuesday)', () => {
    const holidays = new Set(['2026-04-06']) // Monday

    const end = addWorkingDays('2026-04-03', 2, holidays) // Friday + 2

    expect(end.toISOString().slice(0, 10)).toBe('2026-04-07')
  })

  it('adds working days with inclusive duration (Friday + 2 with no Monday holiday = Monday)', () => {
    const end = addWorkingDays('2026-04-03', 2, new Set())

    expect(end.toISOString().slice(0, 10)).toBe('2026-04-06')
  })

  it('keeps same day when duration is 1 on working day', () => {
    const end = addWorkingDays('2026-04-07', 1, new Set())

    expect(end.toISOString().slice(0, 10)).toBe('2026-04-07')
  })

  it('returns next business day when starting from non-working date', () => {
    const holidays = new Set(['2026-04-06'])

    const next = nextWorkingDay('2026-04-05', holidays) // Sunday

    expect(next.toISOString().slice(0, 10)).toBe('2026-04-07')
  })

  it('counts only working days in an inclusive range', () => {
    const holidays = new Set(['2026-04-06'])

    const count = countWorkingDays('2026-04-03', '2026-04-08', holidays)

    // Fri, Tue, Wed => 3
    expect(count).toBe(3)
  })

  it('returns deterministic values for repeated arithmetic', () => {
    const holidays = new Set(['2026-04-06'])
    const first = addWorkingDays('2026-04-03', 4, holidays)
    const second = addWorkingDays('2026-04-03', 4, holidays)

    expect(first.toISOString()).toBe(second.toISOString())
  })

  it('returns 0 when count range is reversed', () => {
    const count = countWorkingDays('2026-04-10', '2026-04-03', new Set())
    expect(count).toBe(0)
  })
})
