import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'Время должно быть в формате ЧЧ:ММ')

export const registerSchema = z.object({
  login: z
    .string()
    .min(3, 'Логин должен содержать от 3 до 32 символов')
    .max(32, 'Логин должен содержать от 3 до 32 символов')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Логин может содержать только латинские буквы, цифры, _ и -'),
  password: z.string().min(6, 'Пароль должен быть не короче 6 символов').max(128, 'Пароль слишком длинный'),
})

export const loginSchema = z.object({
  login: z
    .string()
    .min(3, 'Логин должен содержать от 3 до 32 символов')
    .max(32, 'Логин должен содержать от 3 до 32 символов')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Логин может содержать только латинские буквы, цифры, _ и -'),
  password: z.string().min(6, 'Пароль должен быть не короче 6 символов'),
})

export const lessonSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1, 'Укажите название занятия'),
    type: z.enum(['weekly', 'once']),
    weekday: z.number().int().min(0).max(6),
    startTime: hhmm,
    endTime: hhmm,
    date: isoDate.optional(),
    location: z.string().trim().max(200).optional(),
    note: z.string().trim().max(2000).optional(),
    color: z.string().max(20).optional(),
  })
  .refine((l) => l.endTime > l.startTime, {
    message: 'Время конца должно быть позже времени начала',
    path: ['endTime'],
  })

export const taskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, 'Укажите название задачи'),
  subject: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  dueDate: isoDate.optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in-progress', 'done']),
  createdAt: z.string(),
  completedAt: z.string().optional(),
})

export const deadlineSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, 'Укажите название дедлайна'),
  type: z.enum(['exam', 'test', 'project', 'homework', 'other']),
  subject: z.string().trim().max(200).optional(),
  date: isoDate,
  time: hhmm.optional(),
  note: z.string().trim().max(2000).optional(),
  createdAt: z.string(),
})

export const noteSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, 'Укажите название заметки'),
  subject: z.string().trim().max(200).optional(),
  content: z.string(),
  tags: z.array(z.string()).max(50).default([]),
  pinned: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const focusSessionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(200).optional(),
  startedAt: z.string(),
  durationMinutes: z.number().int().min(1).max(600),
  completed: z.boolean(),
})

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  pomodoroWorkMinutes: z.number().int().min(1).max(120),
  pomodoroShortBreakMinutes: z.number().int().min(1).max(60),
  pomodoroLongBreakMinutes: z.number().int().min(1).max(120),
})

export const gameRecordSchema = z.object({
  game: z.enum(['memory', 'snake', 'minesweeper']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  value: z.number().int().min(0),
})

export const roleParamSchema = z.object({
  role: z.enum(['user', 'admin']),
})

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
})
