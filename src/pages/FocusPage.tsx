import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { usePomodoroStore, type PomodoroMode } from '../store/usePomodoroStore'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import ModeSwitch from '../components/focus/ModeSwitch'
import Timer from '../components/focus/Timer'

const DURATION_KEYS: Record<PomodoroMode, 'pomodoroWorkMinutes' | 'pomodoroShortBreakMinutes' | 'pomodoroLongBreakMinutes'> = {
  work: 'pomodoroWorkMinutes',
  shortBreak: 'pomodoroShortBreakMinutes',
  longBreak: 'pomodoroLongBreakMinutes',
}

const DURATION_FIELDS: Record<PomodoroMode, { label: string; max: number; fallback: number }> = {
  work: { label: 'Работа (минут)', max: 120, fallback: 25 },
  shortBreak: { label: 'Короткий перерыв (минут)', max: 60, fallback: 5 },
  longBreak: { label: 'Длинный перерыв (минут)', max: 60, fallback: 15 },
}

export default function FocusPage() {
  const tasks = useStore((s) => s.tasks)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const pomodoro = usePomodoroStore()

  const subjects = useMemo(() => Array.from(new Set(tasks.map((t) => t.subject).filter(Boolean))).sort() as string[], [tasks])

  const durationKey = DURATION_KEYS[pomodoro.mode]
  const durationField = DURATION_FIELDS[pomodoro.mode]

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Таймер фокусировки" subtitle="Метод Pomodoro: работай и отдыхай по расписанию" />
      <Card>
        <div className="flex flex-col items-center gap-6">
          <ModeSwitch mode={pomodoro.mode} onChange={(m) => pomodoro.setMode(m as PomodoroMode)} />
          <div className="w-full">
            <Input
              label={durationField.label}
              type="number"
              min={1}
              max={durationField.max}
              value={settings[durationKey]}
              onChange={(e) => updateSettings({ [durationKey]: Math.max(1, Number(e.target.value) || durationField.fallback) })}
            />
          </div>
          <Timer secondsLeft={pomodoro.secondsLeft} isRunning={pomodoro.isRunning} onStart={pomodoro.start} onPause={pomodoro.pause} onReset={pomodoro.reset} />
          <Select label="Предмет" value={pomodoro.subject} onChange={(e) => pomodoro.setSubject(e.target.value)}>
            <option value="">Без предмета</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <p className="text-sm text-gray-500 dark:text-gray-400">Сессий завершено: {pomodoro.sessionCount}</p>
        </div>
      </Card>
    </div>
  )
}