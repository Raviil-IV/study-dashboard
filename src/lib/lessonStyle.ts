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
    surface: 'bg-[#CFAA7D]/30 hover:bg-[#CFAA7D]/40 dark:bg-[#CFAA7D]/20 dark:hover:bg-[#CFAA7D]/30',
    surfaceStatic: 'bg-[#CFAA7D]/30 dark:bg-[#CFAA7D]/20',
    title: 'text-[#6B4A18] dark:text-[#EBD3A9]',
    meta: 'text-[#8A6534] dark:text-[#C3A87F]',
  },
  room: {
    surface: 'bg-[#B89BB2]/30 hover:bg-[#B89BB2]/40 dark:bg-[#B89BB2]/20 dark:hover:bg-[#B89BB2]/30',
    surfaceStatic: 'bg-[#B89BB2]/30 dark:bg-[#B89BB2]/20',
    title: 'text-[#573F5A] dark:text-[#E3CFDF]',
    meta: 'text-[#7A6280] dark:text-[#BCA6B8]',
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
