import Tabs from '../ui/Tabs'

export default function ModeSwitch({ mode, onChange }: { mode: string; onChange: (m: string) => void }) {
  return (
    <Tabs
      tabs={[
        { value: 'work', label: 'Работа' },
        { value: 'shortBreak', label: 'Короткий перерыв' },
        { value: 'longBreak', label: 'Длинный перерыв' },
      ]}
      value={mode}
      onChange={onChange}
    />
  )
}
