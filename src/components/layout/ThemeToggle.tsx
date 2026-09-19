import { useTheme } from '../../hooks/useTheme'
import Icon from '../ui/Icon'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      aria-label="Переключить тему"
      title={next === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
      onClick={() => setTheme(next)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      <Icon name={next === 'dark' ? 'moon' : 'sun'} />
    </button>
  )
}
