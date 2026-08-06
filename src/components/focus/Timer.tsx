import Button from '../ui/Button'

export default function Timer({ secondsLeft, isRunning, onStart, onPause, onReset }: { secondsLeft: number; isRunning: boolean; onStart: () => void; onPause: () => void; onReset: () => void }) {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-7xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{display}</div>
      <div className="flex items-center gap-3">
        <Button onClick={isRunning ? onPause : onStart} size="md">
          {isRunning ? 'Пауза' : 'Старт'}
        </Button>
        <Button variant="secondary" onClick={onReset}>Сброс</Button>
      </div>
    </div>
  )
}
