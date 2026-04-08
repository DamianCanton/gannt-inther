import type { IsoDate } from '@/types/gantt'

const DAY_MS = 24 * 60 * 60 * 1000

function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10) as IsoDate
}

function addCalendarDays(date: Date, amount: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

/**
 * Normalize date input to UTC date-only (00:00:00.000Z).
 */
export function toUtcDateOnly(input: Date | string): Date {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()))
  }

  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw new Error(`Invalid ISO date: ${input}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Returns true when date is Saturday(6) or Sunday(0).
 */
export function isWeekend(input: Date | string): boolean {
  const date = toUtcDateOnly(input)
  const weekday = date.getUTCDay()
  return weekday === 0 || weekday === 6
}

/**
 * Returns true when date exists in holiday set.
 */
export function isHoliday(input: Date | string, holidays: ReadonlySet<string>): boolean {
  const date = toUtcDateOnly(input)
  return holidays.has(toIsoDate(date))
}

/**
 * Check if a date is a business day.
 */
export function addWorkingDays(
  startDate: Date | string,
  duration: number,
  holidays: ReadonlySet<string>
): Date {
  if (duration < 1) {
    throw new Error('duration must be >= 1')
  }

  let current = nextWorkingDay(startDate, holidays)
  let remaining = duration - 1

  while (remaining > 0) {
    current = addCalendarDays(current, 1)
    if (isWorkingDay(current, holidays)) {
      remaining -= 1
    }
  }

  return current
}

/**
 * Check if a date is a working day (not weekend, not holiday).
 * 
 * @param date - Date to check
 * @param holidays - Set of holiday dates in ISO format (YYYY-MM-DD)
 * @returns true if working day, false otherwise
 * @throws Error if not implemented
 * 
 * @example
 * isWorkingDay(new Date('2024-01-01'), new Set()) // true (Monday)
 * isWorkingDay(new Date('2024-01-06'), new Set()) // false (Saturday)
 * 
 * // TODO: Implement in Phase 2
 */
export function isWorkingDay(date: Date | string, holidays: ReadonlySet<string>): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays)
}

/**
 * Returns the same day if it is working day, otherwise next working day.
 */
export function nextWorkingDay(date: Date | string, holidays: ReadonlySet<string>): Date {
  let current = toUtcDateOnly(date)
  while (!isWorkingDay(current, holidays)) {
    current = new Date(current.getTime() + DAY_MS)
  }
  return current
}

/**
 * Count working days between two dates (inclusive).
 * 
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param holidays - Set of holiday dates in ISO format (YYYY-MM-DD)
 * @returns Number of working days
 * @throws Error if not implemented
 * 
 * @example
 * // Mon to Fri = 5 working days
 * countWorkingDays(new Date('2024-01-01'), new Date('2024-01-05'), new Set())
 * 
 * // TODO: Implement in Phase 2
 */
export function countWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
  holidays: ReadonlySet<string>
): number {
  const start = toUtcDateOnly(startDate)
  const end = toUtcDateOnly(endDate)

  if (start.getTime() > end.getTime()) {
    return 0
  }

  let count = 0
  let current = start
  while (current.getTime() <= end.getTime()) {
    if (isWorkingDay(current, holidays)) {
      count += 1
    }
    current = addCalendarDays(current, 1)
  }

  return count
}
