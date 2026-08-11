import { sql } from 'drizzle-orm'
import { db } from '../db/client'

export interface TrendDay {
  day: string
  focusMinutes: number
  tasksDone: number
}

export interface GlobalStats {
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
      (SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM focus_sessions WHERE started_at >= now() - interval '7 days'
          UNION
          SELECT user_id FROM tasks WHERE created_at >= now() - interval '7 days' OR completed_at >= now() - interval '7 days'
        ) act7) AS active_users_7d,
      (SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM focus_sessions WHERE started_at >= now() - interval '30 days'
          UNION
          SELECT user_id FROM tasks WHERE created_at >= now() - interval '30 days' OR completed_at >= now() - interval '30 days'
        ) act30) AS active_users_30d,
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
    activeUsers30d: r.active_users_30d,
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
  const [focusRows, taskRows] = await Promise.all([
    db.execute(sql`
      SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
             COALESCE(sum(duration_minutes), 0)::int AS minutes
      FROM focus_sessions
      ${scope} completed AND started_at >= now() - interval '30 days'
      GROUP BY 1
    `).then((res) => res.rows),
    db.execute(sql`
      SELECT to_char(date_trunc('day', completed_at), 'YYYY-MM-DD') AS day,
             count(*)::int AS done
      FROM tasks
      ${scope} completed_at IS NOT NULL AND completed_at >= now() - interval '30 days'
      GROUP BY 1
    `).then((res) => res.rows),
  ])
  const byDay = new Map<string, TrendDay>()
  for (const r of focusRows as { day: string; minutes: number }[]) {
    byDay.set(r.day, { day: r.day, focusMinutes: r.minutes, tasksDone: 0 })
  }
  for (const r of taskRows as { day: string; done: number }[]) {
    const cur = byDay.get(r.day) ?? { day: r.day, focusMinutes: 0, tasksDone: 0 }
    cur.tasksDone = r.done
    byDay.set(r.day, cur)
  }
  const days: TrendDay[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = toIsoDate(d)
    days.push(byDay.get(key) ?? { day: key, focusMinutes: 0, tasksDone: 0 })
  }
  return days
}
