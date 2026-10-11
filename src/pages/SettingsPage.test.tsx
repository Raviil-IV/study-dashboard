import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'
import { useStore } from '../store/useStore'

const originalUpdateSettings = useStore.getState().updateSettings

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

afterEach(() => {
  act(() => {
    useStore.setState({ updateSettings: originalUpdateSettings })
  })
})

describe('SettingsPage', () => {
  it('changes theme via select', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await user.selectOptions(screen.getByLabelText('Тема'), 'dark')
    expect(useStore.getState().settings.theme).toBe('dark')
  })

  it('updates pomodoro work minutes on blur', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    const input = screen.getByLabelText('Работа (минут)')
    await user.clear(input)
    await user.type(input, '50')
    await user.tab()
    expect(useStore.getState().settings.pomodoroWorkMinutes).toBe(50)
  })

  it('exposes the server limits on each duration field', () => {
    render(<SettingsPage />)
    expect((screen.getByLabelText('Работа (минут)') as HTMLInputElement).max).toBe('120')
    expect((screen.getByLabelText('Короткий перерыв (минут)') as HTMLInputElement).max).toBe('60')
    expect((screen.getByLabelText('Длинный перерыв (минут)') as HTMLInputElement).max).toBe('120')
  })

  it('saves once after several keystrokes followed by blur', async () => {
    const user = userEvent.setup()
    const updateSettings = vi.fn()
    act(() => {
      useStore.setState({ updateSettings })
    })
    render(<SettingsPage />)
    const input = screen.getByLabelText('Работа (минут)')
    await user.clear(input)
    await user.type(input, '50')
    expect(updateSettings).not.toHaveBeenCalled()
    await user.tab()
    expect(updateSettings).toHaveBeenCalledTimes(1)
    expect(updateSettings).toHaveBeenCalledWith({ pomodoroWorkMinutes: 50 })
  })
})
