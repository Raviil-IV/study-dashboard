import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'
import { useStore } from '../store/useStore'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('SettingsPage', () => {
  it('changes theme via select', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await user.selectOptions(screen.getByLabelText('Тема'), 'dark')
    expect(useStore.getState().settings.theme).toBe('dark')
  })

  it('updates pomodoro work minutes', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    const input = screen.getByLabelText('Работа (минут)')
    await user.type(input, '50', { initialSelectionStart: 0, initialSelectionEnd: 2 })
    expect(useStore.getState().settings.pomodoroWorkMinutes).toBe(50)
  })
})
