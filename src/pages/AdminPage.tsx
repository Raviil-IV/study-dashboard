import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { notifyError } from '../lib/toast'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ActivityChart from '../components/admin/ActivityChart'
import StatsCards from '../components/admin/StatsCards'
import UsersTable from '../components/admin/UsersTable'
import UserStats from '../components/admin/UserStats'
import type { AdminStats, AdminUser, AdminUserStats } from '../types/admin'

type Tab = 'overview' | 'users'

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selected, setSelected] = useState<AdminUserStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [statsData, usersData] = await Promise.all([api.get<AdminStats>('/admin/stats'), api.get<AdminUser[]>('/admin/users')])
      setStats(statsData)
      setUsers(usersData)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        notifyError(err)
        navigate('/', { replace: true })
        return
      }
      notifyError(err)
      setError('Не удалось загрузить данные')
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  const openUser = async (u: AdminUser) => {
    try {
      const data = await api.get<AdminUserStats>(`/admin/users/${u.id}/stats`)
      setSelected(data)
    } catch (err) {
      notifyError(err)
    }
  }

  const toggleRole = async (u: AdminUser) => {
    const role = u.role === 'admin' ? 'user' : 'admin'
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role })
      setUsers((list) => list.map((item) => (item.id === u.id ? { ...item, role } : item)))
    } catch (err) {
      notifyError(err)
    }
  }

  const deleteUser = async (u: AdminUser) => {
    try {
      await api.delete(`/admin/users/${u.id}`)
      setUsers((list) => list.filter((item) => item.id !== u.id))
      setSelected((cur) => (cur && cur.profile.id === u.id ? null : cur))
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <div>
      <PageHeader title="Админ-панель" subtitle="Статистика платформы и управление ролями" />
      {error && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Обновить
          </Button>
        </div>
      )}
      {!selected && (
        <div className="mb-4 flex gap-2">
          <Button variant={tab === 'overview' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('overview')}>
            Сводка
          </Button>
          <Button variant={tab === 'users' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('users')}>
            Пользователи
          </Button>
        </div>
      )}
      {selected ? (
        <UserStats stats={selected} onBack={() => setSelected(null)} />
      ) : tab === 'overview' ? (
        <div className="space-y-4">
          {stats && <StatsCards stats={stats} />}
          {stats && stats.trend.length > 0 && (
            <Card title="Активность за 7 дней (заходы и задачи)">
              <ActivityChart data={stats.trend} />
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <UsersTable users={users} onOpen={(u) => void openUser(u)} onToggleRole={(u) => void toggleRole(u)} onDelete={(u) => void deleteUser(u)} />
        </Card>
      )}
    </div>
  )
}
