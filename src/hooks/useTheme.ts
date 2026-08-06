import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  const updateSettings = useStore((s) => s.updateSettings)

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  return { theme, resolvedTheme, setTheme: (t: Theme) => updateSettings({ theme: t }) }
}
