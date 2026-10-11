import { useStore } from '../store/useStore'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import PomodoroDurationInput from '../components/settings/PomodoroDurationInput'
import { POMODORO_LIMITS } from '../lib/constants'

export default function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)

  return (
    <div className="max-w-xl">
      <PageHeader title="Настройки" subtitle="Тема и таймер фокусировки" />
      <div className="space-y-4">
        <Card title="Внешний вид">
          <Select label="Тема" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
            <option value="system">Как в системе</option>
          </Select>
        </Card>
        <Card title="Таймер Pomodoro">
          <div className="grid grid-cols-3 gap-4">
            <PomodoroDurationInput
              label="Работа (минут)"
              min={POMODORO_LIMITS.pomodoroWorkMinutes.min}
              max={POMODORO_LIMITS.pomodoroWorkMinutes.max}
              value={settings.pomodoroWorkMinutes}
              onCommit={(v) => updateSettings({ pomodoroWorkMinutes: v })}
            />
            <PomodoroDurationInput
              label="Короткий перерыв (минут)"
              min={POMODORO_LIMITS.pomodoroShortBreakMinutes.min}
              max={POMODORO_LIMITS.pomodoroShortBreakMinutes.max}
              value={settings.pomodoroShortBreakMinutes}
              onCommit={(v) => updateSettings({ pomodoroShortBreakMinutes: v })}
            />
            <PomodoroDurationInput
              label="Длинный перерыв (минут)"
              min={POMODORO_LIMITS.pomodoroLongBreakMinutes.min}
              max={POMODORO_LIMITS.pomodoroLongBreakMinutes.max}
              value={settings.pomodoroLongBreakMinutes}
              onCommit={(v) => updateSettings({ pomodoroLongBreakMinutes: v })}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
