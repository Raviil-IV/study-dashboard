import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { Lesson } from '../types'
import { formatDate, formatTime, isToday, isOverdue, daysUntil, getTodayWeekday, toISODate, isLessonNow, nextLesson, getMonthGrid, isLessonOnDate } from './date'

describe('date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // 2026-08-06, Thursday
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formatDate formats ISO date in Russian', () => {
    expect(formatDate('2026-08-06')).toBe('6 августа')
  })

  it('formatTime returns time as is', () => {
    expect(formatTime('09:30')).toBe('09:30')
  })

  it('isToday detects today', () => {
    expect(isToday('2026-08-06')).toBe(true)
    expect(isToday('2026-08-07')).toBe(false)
  })

  it('isOverdue detects past dates', () => {
    expect(isOverdue('2026-08-05')).toBe(true)
    expect(isOverdue('2026-08-06')).toBe(false)
    expect(isOverdue('2026-08-07')).toBe(false)
  })

  it('daysUntil returns difference in days', () => {
    expect(daysUntil('2026-08-07')).toBe(1)
    expect(daysUntil('2026-08-04')).toBe(-2)
  })

  it('getTodayWeekday returns JS getDay() value', () => {
    expect(getTodayWeekday()).toBe(4) // Thursday
  })

  it('toISODate converts Date to YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 7, 6))).toBe('2026-08-06')
  })

  it('isLessonNow checks current time within lesson', () => {
    const lesson = { weekday: 4, startTime: '11:00', endTime: '13:00' }
    expect(isLessonNow(lesson)).toBe(true)
    const past = { weekday: 4, startTime: '08:00', endTime: '09:00' }
    expect(isLessonNow(past)).toBe(false)
    const wrongDay = { weekday: 5, startTime: '11:00', endTime: '13:00' }
    expect(isLessonNow(wrongDay)).toBe(false)
  })

  it('nextLesson returns soonest upcoming lesson by weekday+time', () => {
    const lessons = [
      { id: '1', title: 'Math', weekday: 4, startTime: '10:00', endTime: '11:00' },
      { id: '2', title: 'Physics', weekday: 4, startTime: '14:00', endTime: '15:00' },
      { id: '3', title: 'English', weekday: 5, startTime: '09:00', endTime: '10:00' },
    ] as Lesson[]
    const next = nextLesson(lessons)
    expect(next?.id).toBe('2')
  })

  it('isLessonNow considers a one-off lesson only on its date', () => {
    const today = { type: 'once', date: '2026-08-06', weekday: 4, startTime: '11:00', endTime: '13:00' } as const
    expect(isLessonNow(today)).toBe(true)
    const otherDay = { type: 'once', date: '2026-08-07', weekday: 5, startTime: '11:00', endTime: '13:00' } as const
    expect(isLessonNow(otherDay)).toBe(false)
  })

  it('nextLesson skips past one-off lessons and orders by date', () => {
    const lessons = [
      { id: '1', type: 'once', title: 'Старое', weekday: 4, startTime: '09:00', endTime: '10:00', date: '2026-08-05' },
      { id: '2', type: 'once', title: 'Завтра', weekday: 5, startTime: '10:00', endTime: '11:00', date: '2026-08-07' },
    ] as Lesson[]
    const next = nextLesson(lessons)
    expect(next?.id).toBe('2')
  })

  it('getMonthGrid returns 42 cells starting on Monday', () => {
    const grid = getMonthGrid(2026, 7) // August
    expect(grid).toHaveLength(42)
    expect(grid[0].date.getDay()).toBe(1) // Monday
    expect(grid[0].iso).toBe('2026-07-27')
    expect(grid[41].date.getDay()).toBe(0) // Sunday
    expect(grid[41].iso).toBe('2026-09-06')
  })

  it('getMonthGrid marks inMonth correctly', () => {
    const grid = getMonthGrid(2026, 7)
    expect(grid.find((d) => d.iso === '2026-08-01')?.inMonth).toBe(true)
    expect(grid.find((d) => d.iso === '2026-08-31')?.inMonth).toBe(true)
    expect(grid.find((d) => d.iso === '2026-07-27')?.inMonth).toBe(false)
    expect(grid.find((d) => d.iso === '2026-09-01')?.inMonth).toBe(false)
    expect(grid.filter((d) => d.inMonth)).toHaveLength(31)
  })

  it('getMonthGrid rolls the year over for December', () => {
    const grid = getMonthGrid(2026, 11) // December 2026
    expect(grid[0].iso).toBe('2026-11-30')
    expect(grid[41].iso).toBe('2027-01-10')
    expect(grid.filter((d) => d.inMonth)).toHaveLength(31)
  })
})

describe('isLessonOnDate', () => {
  // 2026-08-06 — четверг (weekday 4)
  const THURSDAY = new Date(2026, 7, 6)

  it('matches a once lesson only on its exact date', () => {
    const lesson = { type: 'once' as const, date: '2026-08-06', weekday: 4 }

    expect(isLessonOnDate(lesson, THURSDAY)).toBe(true)
    expect(isLessonOnDate(lesson, new Date(2026, 7, 13))).toBe(false) // следующий четверг
    expect(isLessonOnDate(lesson, new Date(2026, 7, 7))).toBe(false) // соседний день
  })

  it('matches a weekly lesson on any day with the same weekday', () => {
    const lesson = { type: 'weekly' as const, weekday: 4 }

    expect(isLessonOnDate(lesson, THURSDAY)).toBe(true)
    expect(isLessonOnDate(lesson, new Date(2026, 7, 13))).toBe(true)
    expect(isLessonOnDate(lesson, new Date(2026, 7, 7))).toBe(false)
  })

  it('treats a lesson without type as weekly', () => {
    const lesson = { weekday: 4 }

    expect(isLessonOnDate(lesson, THURSDAY)).toBe(true)
    expect(isLessonOnDate(lesson, new Date(2026, 7, 7))).toBe(false)
  })
})
