import express from 'express'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth'
import { stateRouter } from './routes/state'
import { settingsRouter } from './routes/settings'
import { gameRecordsRouter } from './routes/gameRecords'
import { createEntityRouter } from './routes/entities'
import { deadlines, focusSessions, lessons, notes, tasks } from './db/schema'
import { deadlineSchema, focusSessionSchema, lessonSchema, noteSchema, taskSchema } from './lib/validation'
import { requireAuth } from './middleware/auth'
import { errorHandler } from './middleware/error'

export const app = express()

app.disable('x-powered-by')
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api/state', requireAuth, stateRouter)
app.use('/api/lessons', requireAuth, createEntityRouter(lessons, lessonSchema))
app.use('/api/tasks', requireAuth, createEntityRouter(tasks, taskSchema))
app.use('/api/deadlines', requireAuth, createEntityRouter(deadlines, deadlineSchema))
app.use('/api/notes', requireAuth, createEntityRouter(notes, noteSchema))
app.use('/api/focus-sessions', requireAuth, createEntityRouter(focusSessions, focusSessionSchema))
app.use('/api/settings', requireAuth, settingsRouter)
app.use('/api/game-records', requireAuth, gameRecordsRouter)
app.use(errorHandler)
