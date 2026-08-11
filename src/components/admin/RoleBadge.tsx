import type { Role } from '../../types'

export default function RoleBadge({ role }: { role: Role }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
        Админ
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      Пользователь
    </span>
  )
}
