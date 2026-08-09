import { useAuth } from '../../store/useAuth'

export default function OfflineBanner() {
  const status = useAuth((s) => s.status)
  if (status !== 'offline') return null
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
      Нет соединения — показаны сохранённые данные
    </div>
  )
}
