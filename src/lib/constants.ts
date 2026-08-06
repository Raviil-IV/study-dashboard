import type { Settings } from '../types'

export const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

export const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export const SUBJECT_COLORS = ['blue', 'green', 'orange', 'pink', 'purple', 'teal', 'yellow', 'gray']

export const COLOR_CLASSES: Record<string, { dot: string; badge: string; text: string }> = {
  blue: { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', text: 'text-blue-600 dark:text-blue-400' },
  green: { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', text: 'text-green-600 dark:text-green-400' },
  orange: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300', text: 'text-orange-600 dark:text-orange-400' },
  pink: { dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300', text: 'text-pink-600 dark:text-pink-400' },
  purple: { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', text: 'text-purple-600 dark:text-purple-400' },
  teal: { dot: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300', text: 'text-teal-600 dark:text-teal-400' },
  yellow: { dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300', text: 'text-yellow-600 dark:text-yellow-400' },
  gray: { dot: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300', text: 'text-gray-600 dark:text-gray-400' },
}

export const COLOR_NAMES: Record<string, string> = {
  blue: 'Синий',
  green: 'Зелёный',
  orange: 'Оранжевый',
  pink: 'Розовый',
  purple: 'Фиолетовый',
  teal: 'Бирюзовый',
  yellow: 'Жёлтый',
  gray: 'Серый',
}

export const NAV_ITEMS = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/schedule', label: 'Расписание', icon: 'calendar' },
  { to: '/tasks', label: 'Задачи', icon: 'check' },
  { to: '/deadlines', label: 'Дедлайны', icon: 'alert' },
  { to: '/notes', label: 'Заметки', icon: 'note' },
  { to: '/focus', label: 'Фокус', icon: 'timer' },
]

export const STORAGE_KEYS = {
  lessons: 'study-dashboard:lessons',
  tasks: 'study-dashboard:tasks',
  deadlines: 'study-dashboard:deadlines',
  notes: 'study-dashboard:notes',
  focusSessions: 'study-dashboard:focus-sessions',
  settings: 'study-dashboard:settings',
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  pomodoroWorkMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
}

export const DEADLINE_TYPES = [
  { value: 'exam', label: 'Экзамен' },
  { value: 'test', label: 'Контрольная / тест' },
  { value: 'project', label: 'Проект' },
  { value: 'homework', label: 'Домашнее задание' },
  { value: 'other', label: 'Другое' },
]

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
]

export const TASK_STATUSES = [
  { value: 'todo', label: 'В работе' },
  { value: 'in-progress', label: 'Выполняется' },
  { value: 'done', label: 'Выполнено' },
]
