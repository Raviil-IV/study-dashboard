import Button from '../ui/Button'
import RoleBadge from './RoleBadge'
import type { AdminUser } from '../../types/admin'

export default function UsersTable({
  users,
  onOpen,
  onToggleRole,
  onDelete,
}: {
  users: AdminUser[]
  onOpen: (u: AdminUser) => void
  onToggleRole: (u: AdminUser) => void
  onDelete: (u: AdminUser) => void
}) {
  if (users.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">Пользователей пока нет</p>

  const handleDelete = (u: AdminUser) => {
    if (window.confirm(`Удалить пользователя ${u.login}? Все его данные (задачи, дедлайны, заметки и т.д.) будут удалены безвозвратно.`)) {
      onDelete(u)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-gray-500 dark:text-gray-400">
          <tr>
            <th className="pb-2 pr-3">Логин</th>
            <th className="pb-2 pr-3">Роль</th>
            <th className="pb-2 pr-3">Задач</th>
            <th className="pb-2 pr-3">Заходов</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{u.login}</td>
              <td className="py-2 pr-3">
                <RoleBadge role={u.role} />
              </td>
              <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{u.taskCount}</td>
              <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{u.visitCount}</td>
              <td className="py-2">
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onOpen(u)}>
                    Открыть
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onToggleRole(u)}>
                    {u.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(u)}>
                    Удалить
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}