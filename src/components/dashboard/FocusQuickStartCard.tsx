import { Link } from 'react-router-dom'
import Card from '../ui/Card'

export default function FocusQuickStartCard() {
  return (
    <Card title="Фокус">
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">25 минут концентрации — и ты на шаг ближе к цели.</p>
      <Link
        to="/focus"
        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        ⏱️ Начать фокусировку
      </Link>
    </Card>
  )
}
