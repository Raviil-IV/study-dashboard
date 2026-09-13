import pino from 'pino'

const level = process.env.LOG_LEVEL ?? 'debug'

export const logger = pino({
  level,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label }
    },
  },
})

export type Logger = typeof logger