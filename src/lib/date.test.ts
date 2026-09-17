import { describe, expect, it } from 'vitest'
import { isLessonOnDate } from './date'

// 2026-08-06 — четверг (weekday 4)
const THURSDAY = new Date(2026, 7, 6)

describe('isLessonOnDate', () => {
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
