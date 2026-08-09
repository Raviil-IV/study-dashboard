import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ThemeToggle from './ThemeToggle'
import OfflineBanner from './OfflineBanner'
import { useToast } from '../../lib/toast'

export default function AppLayout() {
  const toastMessage = useToast((s) => s.message)
  const hideToast = useToast((s) => s.hide)

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(hideToast, 4000)
    return () => clearTimeout(timer)
  }, [toastMessage, hideToast])

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <OfflineBanner />
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
      {toastMessage && (
        <div
          role="alert"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
