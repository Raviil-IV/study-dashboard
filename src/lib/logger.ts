export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel =
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) ??
  (import.meta.env.DEV ? 'debug' : 'warn')

export class Logger {
  private component: string

  constructor(component: string) {
    this.component = component
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const entry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      component: this.component,
    }

    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'

    console[consoleMethod](JSON.stringify(entry))
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }
}

export function createLogger(component: string): Logger {
  return new Logger(component)
}