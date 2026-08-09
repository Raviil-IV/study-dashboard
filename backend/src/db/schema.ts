import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
})

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: text('type', { enum: ['weekly', 'once'] }).notNull(),
    weekday: smallint('weekday').notNull(),
    startTime: varchar('start_time', { length: 5 }).notNull(),
    endTime: varchar('end_time', { length: 5 }).notNull(),
    date: date('date'),
    location: text('location'),
    note: text('note'),
    color: varchar('color', { length: 20 }),
  },
  (t) => [index('lessons_user_idx').on(t.userId)],
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    subject: text('subject'),
    description: text('description'),
    dueDate: date('due_date'),
    priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull(),
    status: text('status', { enum: ['todo', 'in-progress', 'done'] }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'string', withTimezone: true }),
  },
  (t) => [index('tasks_user_idx').on(t.userId)],
)

export const deadlines = pgTable(
  'deadlines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: text('type', { enum: ['exam', 'test', 'project', 'homework', 'other'] }).notNull(),
    subject: text('subject'),
    date: date('date').notNull(),
    time: varchar('time', { length: 5 }),
    note: text('note'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('deadlines_user_idx').on(t.userId)],
)

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    subject: text('subject'),
    content: text('content').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notes_user_idx').on(t.userId)],
)

export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    label: text('label'),
    subject: text('subject'),
    startedAt: timestamp('started_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    durationMinutes: smallint('duration_minutes').notNull(),
    completed: boolean('completed').notNull().default(false),
  },
  (t) => [index('focus_sessions_user_idx').on(t.userId)],
)

export const settings = pgTable('settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme', { enum: ['light', 'dark', 'system'] }).notNull().default('system'),
  pomodoroWorkMinutes: smallint('pomodoro_work_minutes').notNull().default(25),
  pomodoroShortBreakMinutes: smallint('pomodoro_short_break_minutes').notNull().default(5),
  pomodoroLongBreakMinutes: smallint('pomodoro_long_break_minutes').notNull().default(15),
})

export const gameRecords = pgTable(
  'game_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    game: text('game', { enum: ['memory', 'snake', 'minesweeper'] }).notNull(),
    difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull(),
    bestValue: integer('best_value').notNull(),
  },
  (t) => [uniqueIndex('game_records_user_game_difficulty_idx').on(t.userId, t.game, t.difficulty)],
)
