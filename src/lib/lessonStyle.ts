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
    surface: 'bg-[#00382B]/30 hover:bg-[#00382B]/40 dark:bg-[#00382B]/20 dark:hover:bg-[#00382B]/30',
    surfaceStatic: 'bg-[#00382B]/30 dark:bg-[#00382B]/20',
    title: 'text-[#00382B] dark:text-[#9ED9C3]',
    meta: 'text-[#1E5C4B] dark:text-[#78B7A1]',
  },
  room: {
    surface: 'bg-[#3D0E69]/30 hover:bg-[#3D0E69]/40 dark:bg-[#3D0E69]/20 dark:hover:bg-[#3D0E69]/30',
    surfaceStatic: 'bg-[#3D0E69]/30 dark:bg-[#3D0E69]/20',
    title: 'text-[#3D0E69] dark:text-[#D9C6EC]',
    meta: 'text-[#553470] dark:text-[#B79CCF]',
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
