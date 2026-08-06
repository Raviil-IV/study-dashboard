import { useCallback, useEffect, useRef, useState } from 'react'

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak'

interface Options {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
}

const MODE_SECONDS = (o: Options, mode: PomodoroMode) => {
  if (mode === 'work') return o.workMinutes * 60
  if (mode === 'shortBreak') return o.shortBreakMinutes * 60
  return o.longBreakMinutes * 60
}

export function usePomodoro(options: Options) {
  const { workMinutes, shortBreakMinutes, longBreakMinutes } = options
  const [mode, setMode] = useState<PomodoroMode>('work')
  const [secondsLeft, setSecondsLeft] = useState(() => MODE_SECONDS(options, 'work'))
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const optionsRef = useRef(options)
  optionsRef.current = options
  const onCompleteRef = useRef<(() => void) | null>(null)

  // tick down one second while running
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 1 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // transition to the next mode when the timer hits zero
  useEffect(() => {
    if (!isRunning || secondsLeft > 0) return
    const wasWork = modeRef.current === 'work'
    if (wasWork) {
      setSessionCount((c) => c + 1)
      onCompleteRef.current?.()
    }
    setMode(wasWork ? 'shortBreak' : 'work')
    setSecondsLeft(MODE_SECONDS(optionsRef.current, wasWork ? 'shortBreak' : 'work'))
    setIsRunning(false)
  }, [isRunning, secondsLeft])

  // resync duration when settings change, only while paused
  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(MODE_SECONDS(options, modeRef.current))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workMinutes, shortBreakMinutes, longBreakMinutes])

  const start = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const reset = useCallback(() => {
    setIsRunning(false)
    setSecondsLeft(MODE_SECONDS(optionsRef.current, modeRef.current))
  }, [])
  const setModeSafe = useCallback((m: PomodoroMode) => {
    setIsRunning(false)
    setMode(m)
    setSecondsLeft(MODE_SECONDS(optionsRef.current, m))
  }, [])
  const completeSession = useCallback((cb: () => void) => {
    onCompleteRef.current = cb
  }, [])

  return {
    mode,
    secondsLeft,
    isRunning,
    sessionCount,
    setMode: setModeSafe,
    start,
    pause,
    reset,
    completeSession,
  }
}
