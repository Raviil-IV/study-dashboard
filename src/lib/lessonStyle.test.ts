import { describe, expect, it } from 'vitest'
import { importedLessonClasses } from './lessonStyle'

const SOURCE = 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/'

describe('importedLessonClasses', () => {
  it('returns null for a manually created lesson', () => {
    expect(importedLessonClasses({ color: 'blue' })).toBeNull()
  })

  it('uses the sand tone for СДО lessons', () => {
    const style = importedLessonClasses({ sourceUrl: SOURCE, color: 'blue' })
    expect(style?.surface).toContain('bg-[#CFAA7D]/30')
    expect(style?.title).toContain('text-[#6B4A18]')
  })

  it('uses the thistle tone for lessons with a room number', () => {
    const style = importedLessonClasses({ sourceUrl: SOURCE, color: 'green' })
    expect(style?.surface).toContain('bg-[#B89BB2]/30')
    expect(style?.title).toContain('text-[#573F5A]')
  })

  it('falls back to the neutral tone for imported lessons without a colour', () => {
    const style = importedLessonClasses({ sourceUrl: SOURCE })
    expect(style?.surface).toContain('bg-[#9CA3AF]/25')
    expect(style?.title).toContain('text-[#374151]')
    expect(importedLessonClasses({ sourceUrl: SOURCE, color: 'purple' })?.surface).toBe(style?.surface)
  })
})
