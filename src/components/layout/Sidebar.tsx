import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../lib/constants'
import { useAuth } from '../../store/useAuth'
import Icon from '../ui/Icon'
import ThemeToggle from './ThemeToggle'

export default function Sidebar() {
  const user = useAuth((s) => s.user)
  const handleLogout = () => {
    void useAuth.getState().logout()
  }

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:flex">
      <div className="mb-6 flex items-center justify-between px-2">
        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Study Dashboard</span>
        <ThemeToggle />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`
            }
          >
            <Icon name={item.icon} className="dark:text-indigo-400" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {user?.role === 'admin' && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
            }`
          }
        >
          <Icon name="shield" className="dark:text-indigo-400" />
          Админка
        </NavLink>
      )}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
          }`
        }
      >
        <Icon name="settings" className="dark:text-indigo-400" />
        Настройки
      </NavLink>
      <div className="mt-auto flex flex-col gap-1 border-t border-gray-200 pt-3 dark:border-gray-800">
        <span className="truncate px-3 text-sm font-medium text-gray-600 dark:text-gray-400">{user?.login}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <span className="text-base">⏻</span>
          Выйти
        </button>
      </div>
    </aside>
  )
}
