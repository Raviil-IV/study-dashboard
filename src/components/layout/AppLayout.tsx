import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ThemeToggle from './ThemeToggle'

export default function AppLayout() {
  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="pb-20 lg:pl-64 lg:pb-8">
        <header className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Study Dashboard</span>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
