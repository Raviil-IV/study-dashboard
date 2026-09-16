export interface Lesson {
  id: string
  title: string
  type: 'weekly' | 'once'
  weekday: number // 0 = Sunday ... 6 = Saturday
  startTime: string // HH:MM
  endTime: string // HH:MM
  date?: string // ISO YYYY-MM-DD, only for type: 'once'
  location?: string
  note?: string
  color?: string
  sourceUrl?: string // ссылка на страницу расписания РАНХиГС, из которой занятие импортировано
}

export interface Task {
  id: string
  title: string
  subject?: string
  description?: string
  dueDate?: string // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in-progress' | 'done'
  createdAt: string // ISO datetime
  completedAt?: string
}

export interface Deadline {
  id: string
  title: string
  type: 'exam' | 'test' | 'project' | 'homework' | 'other'
  subject?: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  note?: string
  createdAt: string
}

export interface Note {
  id: string
  title: string
  subject?: string
  content: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface FocusSession {
  id: string
  label?: string
  subject?: string
  startedAt: string
  durationMinutes: number
  completed: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  pomodoroWorkMinutes: number
  pomodoroShortBreakMinutes: number
  pomodoroLongBreakMinutes: number
}

export interface RanepaImportStatus {
  url: string
  groupName?: string
  syncedAt: string // ISO datetime
  groups: string[] // сохранённый фильтр групп (пусто = все)
}

export interface RanepaInvalidLesson {
  title: string
  startTime: string
  endTime: string
  type?: string
  teacher?: string
  location?: string
  rawDay: string
  rawMonth: string
  reason: 'malformed' | 'date_not_exists'
  rawGroup: string
}

export interface RanepaGroupOption {
  rawGroup: string
  count: number
  invalidCount: number
}

export interface RanepaPreview {
  groupName: string
  count: number
  firstDate?: string
  lastDate?: string
  lessons: Lesson[]
  invalid: RanepaInvalidLesson[]
  groups: RanepaGroupOption[]
}

export type Role = 'user' | 'admin'

export interface User {
  id: string
  login: string
  role: Role
}
