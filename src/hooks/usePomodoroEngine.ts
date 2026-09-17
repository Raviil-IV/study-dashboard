import { useEffect } from 'react'
import { usePomodoroStore } from '../store/usePomodoroStore'
import { useStore } from '../store/useStore'

/**
 * Drives the global pomodoro store: ticks once a second while running and
 * resyncs durations from settings while paused. Mounted once in AppLayout
 * so the timer keeps running on every page.
 */
export function usePomodoroEngine() {
  const isRunning = usePomodoroStore((s) => s.isRunning)
  const tick = usePomodoroStore((s) => s.tick)
  const workMinutes = useStore((s) => s.settings.pomodoroWorkMinutes)
  const shortBreakMinutes = useStore((s) => s.settings.pomodoroShortBreakMinutes)
  const longBreakMinutes = useStore((s) => s.settings.pomodoroLongBreakMinutes)

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      usePomodoroStore.getState().tick()
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, tick])

  useEffect(() => {
    usePomodoroStore.getState().syncDurations()
  }, [workMinutes, shortBreakMinutes, longBreakMinutes])
}
