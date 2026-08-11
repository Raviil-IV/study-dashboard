import type { Role } from './index'

export interface AdminUser {
  id: string
  login: string
  role: Role
  createdAt: string
  taskCount: number
  sessionCount: number
}

export interface TrendDay {
  day: string
  focusMinutes: number
  tasksDone: number
}

export interface AdminStats {
  totalUsers: number
  newUsers7d: number
  newUsers30d: number
  activeUsers7d: number
  activeUsers30d: number
  focusMinutes7d: number
  focusMinutes30d: number
  avgSessionMinutes: number
  tasksTotal: number
  tasksDone: number
  tasksDonePercent: number
  tasksOverdue: number
  deadlinesUpcoming7d: number
  deadlinesOverdue: number
  notesTotal: number
  notesPerUser: number
  trend: TrendDay[]
}

export interface AdminUserStats {
  profile: { id: string; login: string; role: Role; createdAt: string }
  focus: { totalSessions: number; totalMinutes: number; minutes30d: number }
  tasks: { total: number; done: number; inProgress: number; overdue: number }
  deadlines: { upcoming: number; overdue: number }
  notes: { total: number }
  games: { game: 'memory' | 'snake' | 'minesweeper'; difficulty: 'easy' | 'medium' | 'hard'; bestValue: number }[]
  activity: TrendDay[]
}
