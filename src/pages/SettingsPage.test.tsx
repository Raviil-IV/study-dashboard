import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'
import { useStore } from '../store/useStore'

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

  it('clears all data', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ tasks: [{ id: '1', title: 'x', priority: 'low', status: 'todo', createdAt: new Date().toISOString() }] })
    render(<SettingsPage />)
    await user.click(screen.getByRole('button', { name: 'Очистить все данные' }))
    expect(useStore.getState().tasks).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
