import type { Lesson } from '../types'

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function formatTime(time: string): string {
  return time
}

export function isToday(date: string): boolean {
  return date === toISODate(new Date())
}

export function isOverdue(date: string): boolean {
  return date < toISODate(new Date())
}

export function daysUntil(date: string): number {
  const today = new Date()
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  return Math.round((parsed.getTime() - target.getTime()) / 86400000)
}

export function getTodayWeekday(): number {
  return new Date().getDay()
}

export function currentWeekMonday(): Date {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return monday
}

export function isLessonNow(lesson: { type?: 'weekly' | 'once'; date?: string; weekday: number; startTime: string; endTime: string }): boolean {
  const now = new Date()
  if (lesson.type === 'once') {
    if (lesson.date !== toISODate(now)) return false
  } else if (lesson.weekday !== now.getDay()) {
    return false
  }
  const minutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = lesson.startTime.split(':').map(Number)
  const [eh, em] = lesson.endTime.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  return minutes >= start && minutes < end
}

export function nextLesson(lessons: Lesson[]): Lesson | null {
  if (lessons.length === 0) return null
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const today = now.getDay()
  const future: { lesson: Lesson; key: number }[] = []
  for (const lesson of lessons) {
    const [h, m] = lesson.startTime.split(':').map(Number)
    const start = h * 60 + m
    let diffDays: number
    if (lesson.type === 'once') {
      if (lesson.date && lesson.date < toISODate(now)) continue
      diffDays = lesson.date ? daysUntil(lesson.date) : (lesson.weekday - today + 7) % 7
    } else {
      diffDays = (lesson.weekday - today + 7) % 7
    }
    let key: number
    if (diffDays === 0 && start <= nowMinutes) {
      key = 7 * 1440 + start
    } else {
      key = diffDays * 1440 + start
    }
    future.push({ lesson, key })
  }
  future.sort((a, b) => a.key - b.key)
  return future[0]?.lesson ?? null
}
