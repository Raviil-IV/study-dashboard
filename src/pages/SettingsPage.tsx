import { useStore } from '../store/useStore'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'

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
            <Input
              label="Работа (минут)"
              type="number"
              min={1}
              max={120}
              value={settings.pomodoroWorkMinutes}
              onChange={(e) => updateSettings({ pomodoroWorkMinutes: Math.max(1, Number(e.target.value) || 25) })}
            />
            <Input
              label="Короткий перерыв (минут)"
              type="number"
              min={1}
              max={60}
              value={settings.pomodoroShortBreakMinutes}
              onChange={(e) => updateSettings({ pomodoroShortBreakMinutes: Math.max(1, Number(e.target.value) || 5) })}
            />
            <Input
              label="Длинный перерыв (минут)"
              type="number"
              min={1}
              max={60}
              value={settings.pomodoroLongBreakMinutes}
              onChange={(e) => updateSettings({ pomodoroLongBreakMinutes: Math.max(1, Number(e.target.value) || 15) })}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
