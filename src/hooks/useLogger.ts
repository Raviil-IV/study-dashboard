import { useRef } from 'react'
import { Logger, createLogger } from '../lib/logger'

export function useLogger(component: string): Logger {
  const loggerRef = useRef<Logger | null>(null)

  if (!loggerRef.current) {
    loggerRef.current = createLogger(component)
  }

  return loggerRef.current
}