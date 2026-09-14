import type { Role } from './index'

export interface AdminUser {
  id: string
  login: string
  role: Role
  createdAt: string
  taskCount: number
  visitCount: number
}

export interface TrendDay {
  day: string
  visits: number
  tasksDone: number
}

export interface AdminStats {
  totalUsers: number
  newUsers7d: number
  newUsers30d: number
  activeUsers7d: number
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
  content: {
    tasks: {
      id: string
      title: string
      subject: string | null
      priority: 'low' | 'medium' | 'high'
      status: 'todo' | 'in-progress' | 'done'
      dueDate: string | null
      createdAt: string
      completedAt: string | null
    }[]
    deadlines: {
      id: string
      title: string
      type: 'exam' | 'test' | 'project' | 'homework' | 'other'
      subject: string | null
      date: string
      time: string | null
    }[]
    notes: {
      id: string
      title: string
      subject: string | null
      content: string
      tags: string[]
      updatedAt: string
    }[]
    lessons: {
      id: string
      title: string
      type: 'weekly' | 'once'
      weekday: number
      startTime: string
      endTime: string
      location: string | null
      color: string | null
    }[]
    focus: {
      id: string
      label: string | null
      subject: string | null
      startedAt: string
      durationMinutes: number
      completed: boolean
    }[]
  }
}