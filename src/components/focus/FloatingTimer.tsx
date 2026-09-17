import { usePomodoroStore, type PomodoroMode } from '../../store/usePomodoroStore'
import Button from '../ui/Button'

const MODE_LABELS: Record<PomodoroMode, string> = {
  work: 'Работа',
  shortBreak: 'Короткий перерыв',
  longBreak: 'Длинный перерыв',
}

export default function FloatingTimer() {
  const isRunning = usePomodoroStore((s) => s.isRunning)
  const secondsLeft = usePomodoroStore((s) => s.secondsLeft)
  const mode = usePomodoroStore((s) => s.mode)
  const pause = usePomodoroStore((s) => s.pause)

  if (!isRunning) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-gray-200 backdrop-blur dark:bg-gray-900/95 dark:ring-gray-700 lg:bottom-6">
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{MODE_LABELS[mode]}</span>
        <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{display}</span>
      </div>
      <Button size="sm" variant="secondary" onClick={pause}>
        Пауза
      </Button>
    </div>
  )
}
