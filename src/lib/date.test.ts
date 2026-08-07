import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { Lesson } from '../types'
import { formatDate, formatTime, isToday, isOverdue, daysUntil, getTodayWeekday, toISODate, isLessonNow, nextLesson } from './date'

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
})
