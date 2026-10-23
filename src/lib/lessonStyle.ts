import type { Lesson } from '../types'

export interface ImportedLessonClasses {
  /** Фон и hover для кликабельных плашек. */
  surface: string
  /** Фон без hover для неинтерактивных строк. */
  surfaceStatic: string
  title: string
  meta: string
}

type Tone = 'sdo' | 'room' | 'neutral'

const TONES: Record<Tone, ImportedLessonClasses> = {
  sdo: {
    surface: 'bg-[#013A33]/30 hover:bg-[#013A33]/40 dark:bg-[#013A33]/20 dark:hover:bg-[#013A33]/30',
    surfaceStatic: 'bg-[#013A33]/30 dark:bg-[#013A33]/20',
    title: 'text-[#013A33] dark:text-[#9FD8CB]',
    meta: 'text-[#1B5048] dark:text-[#78B7AA]',
  },
  room: {
    surface: 'bg-[#A17A99]/30 hover:bg-[#A17A99]/40 dark:bg-[#A17A99]/20 dark:hover:bg-[#A17A99]/30',
    surfaceStatic: 'bg-[#A17A99]/30 dark:bg-[#A17A99]/20',
    title: 'text-[#5C3D55] dark:text-[#E3CFDF]',
    meta: 'text-[#6E4C66] dark:text-[#C9A9C1]',
  },
  neutral: {
    surface: 'bg-[#9CA3AF]/25 hover:bg-[#9CA3AF]/35 dark:bg-[#9CA3AF]/15 dark:hover:bg-[#9CA3AF]/25',
    surfaceStatic: 'bg-[#9CA3AF]/25 dark:bg-[#9CA3AF]/15',
    title: 'text-[#374151] dark:text-[#D1D5DB]',
    meta: 'text-[#6B7280] dark:text-[#9CA3AF]',
  },
}

// Бэкенд помечает импортированные занятия цветами blue (СДО) и green (кабинет),
// поэтому оттенок выводится из color, а не из location.
function toneFor(color?: string): Tone {
  if (color === 'blue') return 'sdo'
  if (color === 'green') return 'room'
  return 'neutral'
}

export function importedLessonClasses(lesson: Pick<Lesson, 'sourceUrl' | 'color'>): ImportedLessonClasses | null {
  if (!lesson.sourceUrl) return null
  return TONES[toneFor(lesson.color)]
}
