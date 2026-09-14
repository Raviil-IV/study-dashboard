import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { deadlines, focusSessions, gameRecords, lessons, notes, tasks, users, visits } from '../db/schema'

export interface TrendDay {
  day: string
  visits: number
  tasksDone: number
}

export interface GlobalStats {
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
}

function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const [row] = (await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM users) AS total_users,
      (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '7 days') AS new_users_7d,
      (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '30 days') AS new_users_30d,
      (SELECT count(DISTINCT user_id)::int FROM visits WHERE visited_at >= now() - interval '7 days') AS active_users_7d,
      (SELECT COALESCE(sum(duration_minutes), 0)::int FROM focus_sessions WHERE completed AND started_at >= now() - interval '7 days') AS focus_minutes_7d,
      (SELECT COALESCE(sum(duration_minutes), 0)::int FROM focus_sessions WHERE completed AND started_at >= now() - interval '30 days') AS focus_minutes_30d,
      (SELECT COALESCE(round(avg(duration_minutes)), 0)::int FROM focus_sessions WHERE completed) AS avg_session_minutes,
      (SELECT count(*)::int FROM tasks) AS tasks_total,
      (SELECT count(*)::int FROM tasks WHERE status = 'done') AS tasks_done,
      (SELECT count(*)::int FROM tasks WHERE status <> 'done' AND due_date < CURRENT_DATE) AS tasks_overdue,
      (SELECT count(*)::int FROM deadlines WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + 7) AS deadlines_upcoming_7d,
      (SELECT count(*)::int FROM deadlines WHERE date < CURRENT_DATE) AS deadlines_overdue,
      (SELECT count(*)::int FROM notes) AS notes_total
  `)).rows
  const r = row as Record<string, number>
  const totalUsers = r.total_users
  const notesTotal = r.notes_total
  const tasksTotal = r.tasks_total
  const tasksDone = r.tasks_done
  return {
    totalUsers,
    newUsers7d: r.new_users_7d,
    newUsers30d: r.new_users_30d,
    activeUsers7d: r.active_users_7d,
    focusMinutes7d: r.focus_minutes_7d,
    focusMinutes30d: r.focus_minutes_30d,
    avgSessionMinutes: r.avg_session_minutes,
    tasksTotal,
    tasksDone,
    tasksDonePercent: tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0,
    tasksOverdue: r.tasks_overdue,
    deadlinesUpcoming7d: r.deadlines_upcoming_7d,
    deadlinesOverdue: r.deadlines_overdue,
    notesTotal,
    notesPerUser: totalUsers > 0 ? Math.round((notesTotal / totalUsers) * 100) / 100 : 0,
  }
}

export async function getTrend(userId: string | null): Promise<TrendDay[]> {
  const scope = userId ? sql`WHERE user_id = ${userId} AND` : sql`WHERE`
  const [visitRows, taskRows] = await Promise.all([
    db.execute(sql`
      SELECT to_char(date_trunc('day', visited_at), 'YYYY-MM-DD') AS day,
             count(*)::int AS visits
      FROM visits
      ${scope} visited_at >= now() - interval '7 days'
      GROUP BY 1
    `).then((res) => res.rows),
    db.execute(sql`
      SELECT to_char(date_trunc('day', completed_at), 'YYYY-MM-DD') AS day,
             count(*)::int AS done
      FROM tasks
      ${scope} completed_at IS NOT NULL AND completed_at >= now() - interval '7 days'
      GROUP BY 1
    `).then((res) => res.rows),
  ])
  const byDay = new Map<string, TrendDay>()
  for (const r of visitRows as { day: string; visits: number }[]) {
    byDay.set(r.day, { day: r.day, visits: r.visits, tasksDone: 0 })
  }
  for (const r of taskRows as { day: string; done: number }[]) {
    const cur = byDay.get(r.day) ?? { day: r.day, visits: 0, tasksDone: 0 }
    cur.tasksDone = r.done
    byDay.set(r.day, cur)
  }
  const days: TrendDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = toIsoDate(d)
    days.push(byDay.get(key) ?? { day: key, visits: 0, tasksDone: 0 })
  }
  return days
}

export interface UserStatsResult {
  profile: { id: string; login: string; role: 'user' | 'admin'; createdAt: string }
  focus: { totalSessions: number; totalMinutes: number; minutes30d: number }
  tasks: { total: number; done: number; inProgress: number; overdue: number }
  deadlines: { upcoming: number; overdue: number }
  notes: { total: number }
  games: { game: string; difficulty: string; bestValue: number }[]
  activity: TrendDay[]
  content: {
    tasks: {
      id: string
      title: string
      subject: string | null
      priority: string
      status: string
      dueDate: string | null
      createdAt: string
      completedAt: string | null
    }[]
    deadlines: {
      id: string
      title: string
      type: string
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
      type: string
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

export async function getUserStats(userId: string): Promise<UserStatsResult | null> {
  const [profile] = await db
    .select({ id: users.id, login: users.login, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
  if (!profile) return null

  const [focusRow, taskRow, deadlineRow, notesRow] = await Promise.all([
    db.execute(sql`
      SELECT count(*)::int AS sessions,
             COALESCE(sum(duration_minutes), 0)::int AS minutes,
             COALESCE(sum(duration_minutes) FILTER (WHERE started_at >= now() - interval '30 days'), 0)::int AS minutes_30d
      FROM focus_sessions WHERE user_id = ${userId}
    `).then((res) => res.rows),
    db.execute(sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE status = 'done')::int AS done,
             count(*) FILTER (WHERE status = 'in-progress')::int AS in_progress,
             count(*) FILTER (WHERE status <> 'done' AND due_date < CURRENT_DATE)::int AS overdue
      FROM tasks WHERE user_id = ${userId}
    `).then((res) => res.rows),
    db.execute(sql`
      SELECT count(*) FILTER (WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + 7)::int AS upcoming,
             count(*) FILTER (WHERE date < CURRENT_DATE)::int AS overdue
      FROM deadlines WHERE user_id = ${userId}
    `).then((res) => res.rows),
    db.execute(sql`SELECT count(*)::int AS total FROM notes WHERE user_id = ${userId}`).then((res) => res.rows),
  ])
  const [gameRows, activity, contentRows] = await Promise.all([
    db
      .select({ game: gameRecords.game, difficulty: gameRecords.difficulty, bestValue: gameRecords.bestValue })
      .from(gameRecords)
      .where(eq(gameRecords.userId, userId)),
    getTrend(userId),
    Promise.all([
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          subject: tasks.subject,
          priority: tasks.priority,
          status: tasks.status,
          dueDate: tasks.dueDate,
          createdAt: tasks.createdAt,
          completedAt: tasks.completedAt,
        })
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .orderBy(desc(tasks.createdAt)),
      db
        .select({
          id: deadlines.id,
          title: deadlines.title,
          type: deadlines.type,
          subject: deadlines.subject,
          date: deadlines.date,
          time: deadlines.time,
        })
        .from(deadlines)
        .where(eq(deadlines.userId, userId))
        .orderBy(deadlines.date),
      db
        .select({
          id: notes.id,
          title: notes.title,
          subject: notes.subject,
          content: notes.content,
          tags: notes.tags,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.updatedAt)),
      db
        .select({
          id: lessons.id,
          title: lessons.title,
          type: lessons.type,
          weekday: lessons.weekday,
          startTime: lessons.startTime,
          endTime: lessons.endTime,
          location: lessons.location,
          color: lessons.color,
        })
        .from(lessons)
        .where(eq(lessons.userId, userId))
        .orderBy(lessons.weekday, lessons.startTime),
      db
        .select({
          id: focusSessions.id,
          label: focusSessions.label,
          subject: focusSessions.subject,
          startedAt: focusSessions.startedAt,
          durationMinutes: focusSessions.durationMinutes,
          completed: focusSessions.completed,
        })
        .from(focusSessions)
        .where(eq(focusSessions.userId, userId))
        .orderBy(desc(focusSessions.startedAt)),
    ]),
  ])
  const [taskRows, deadlineRows, noteRows, lessonRows, focusRows] = contentRows
  const f = focusRow[0] as Record<string, number>
  const t = taskRow[0] as Record<string, number>
  const d = deadlineRow[0] as Record<string, number>
  const n = notesRow[0] as Record<string, number>
  return {
    profile,
    focus: { totalSessions: f.sessions, totalMinutes: f.minutes, minutes30d: f.minutes_30d },
    tasks: { total: t.total, done: t.done, inProgress: t.in_progress, overdue: t.overdue },
    deadlines: { upcoming: d.upcoming, overdue: d.overdue },
    notes: { total: n.total },
    games: gameRows,
    activity,
    content: {
      tasks: taskRows,
      deadlines: deadlineRows,
      notes: noteRows,
      lessons: lessonRows,
      focus: focusRows,
    },
  }
}
