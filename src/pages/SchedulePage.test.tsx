import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SchedulePage from './SchedulePage'
import { useStore } from '../store/useStore'
import { api } from '../lib/api'

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }))

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../lib/toast', () => ({
  notifyError: vi.fn(),
  useToast: { getState: () => ({ show: showToastMock }) },
}))

const URL_RANEPA = 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/'

function renderPage() {
  return render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // 2026-08-06, Thursday
  localStorage.clear()
  useStore.setState({
    lessons: [{ id: '1', type: 'weekly', title: 'Математика', weekday: 4, startTime: '09:00', endTime: '10:30', location: 'Каб. 201', color: 'blue' }],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('SchedulePage', () => {
  it('shows lesson in day view (today is Thursday, weekday 4)', () => {
    renderPage()
    expect(screen.getByText('Математика')).toBeInTheDocument()
  })

  it('switches to week view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    expect(screen.getByText('Пн')).toBeInTheDocument()
  })

  it('adds a lesson via the modal form', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Физика')
    await user.selectOptions(screen.getByLabelText('День недели'), '4')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(2)
    expect(useStore.getState().lessons[1].title).toBe('Физика')
    expect(screen.getByText('Физика')).toBeInTheDocument()
  })

  it('adds a one-off lesson on a specific date', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Консультация')
    await user.click(screen.getByRole('radio', { name: 'На конкретную дату' }))
    fireEvent.change(screen.getByLabelText('Дата'), { target: { value: '2026-08-07' } })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    const added = useStore.getState().lessons[1]
    expect(added.type).toBe('once')
    expect(added.date).toBe('2026-08-07')
    expect(added.weekday).toBe(5) // Friday
  })

  it('requires a date for one-off lessons', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Консультация')
    await user.click(screen.getByRole('radio', { name: 'На конкретную дату' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(1)
    expect(screen.getByText('Выберите дату')).toBeInTheDocument()
  })

  it('shows a one-off lesson only on its own date in day view', () => {
    useStore.setState({ lessons: [{ id: '2', type: 'once', title: 'Семинар', weekday: 4, startTime: '13:00', endTime: '14:00', date: '2026-08-06' }] })
    renderPage()
    expect(screen.getByText('Семинар')).toBeInTheDocument()
  })

  it('opens the edit modal when a day view lesson card is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    expect(screen.getByText('Редактировать занятие')).toBeInTheDocument()
  })

  it('opens the edit modal when a week view lesson is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    expect(screen.getByText('Редактировать занятие')).toBeInTheDocument()
  })

  it('deletes a lesson via the edit modal from the week view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(useStore.getState().lessons).toHaveLength(0)
    expect(screen.queryByText('Редактировать занятие')).not.toBeInTheDocument()
  })

  it('deletes a lesson via the edit modal from the month view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(useStore.getState().lessons).toHaveLength(0)
  })

  it('validates end time after start time', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Физика')
    await user.clear(screen.getByLabelText('Начало'))
    await user.type(screen.getByLabelText('Начало'), '12:00')
    await user.clear(screen.getByLabelText('Конец'))
    await user.type(screen.getByLabelText('Конец'), '11:00')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(1)
    expect(screen.getByText('Время конца должно быть позже времени начала')).toBeInTheDocument()
  })

  it('switches to month view and shows the current month', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    expect(screen.getByText(/август 2026/)).toBeInTheDocument()
    // The weekly lesson appears in every Thursday cell of the grid, so use the plural query.
    expect(screen.getAllByText('Математика').length).toBeGreaterThan(0)
  })

  it('opens the edit modal when a month view lesson is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    expect(screen.getByText('Редактировать занятие')).toBeInTheDocument()
  })

  it('shows the ranepa import button and opens the import modal', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ imports: [] })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Импорт из РАНХиГС' }))

    expect(screen.getByLabelText(/ссылка на расписание/i)).toBeInTheDocument()
  })

  it('labels the import button «Обновить из РАНХиГС» when an import exists', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      imports: [{ url: URL_RANEPA, groupName: 'БИ-4-26-02', syncedAt: new Date().toISOString() }],
    })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Обновить из РАНХиГС' })).toBeInTheDocument()
  })

  it('auto-refreshes imports older than 24 hours when the page opens', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      imports: [{ url: URL_RANEPA, groupName: 'БИ-4-26-02', syncedAt: '2026-08-04T12:00:00.000Z' }],
    })
    vi.mocked(api.post).mockResolvedValue({
      groupName: 'БИ-4-26-02',
      count: 1,
      lessons: [{ id: 'imp9', title: 'Свежая пара', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: URL_RANEPA }],
    })
    renderPage()

    await vi.waitFor(() => expect(api.post).toHaveBeenCalledWith('/ranepa/import', { url: URL_RANEPA }))
    expect(useStore.getState().lessons.some((l) => l.title === 'Свежая пара')).toBe(true)
    expect(showToastMock).toHaveBeenCalledWith('Расписание обновлено: 1 занятие')
  })

  it('does not refresh fresh imports when the page opens', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      imports: [{ url: URL_RANEPA, groupName: 'БИ-4-26-02', syncedAt: new Date().toISOString() }],
    })
    renderPage()

    await vi.waitFor(() => expect(api.get).toHaveBeenCalledWith('/ranepa/status'))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('auto-refresh passes stored group filters', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      imports: [{ url: URL_RANEPA, groupName: 'БИ-3-24-03-04', syncedAt: '2026-08-04T12:00:00.000Z', groups: ['БИ-3-24-04'] }],
    })
    vi.mocked(api.post).mockResolvedValue({ groupName: 'БИ-3-24-03-04', count: 1, lessons: [] })
    renderPage()

    await vi.waitFor(() => expect(api.post).toHaveBeenCalledWith('/ranepa/import', { url: URL_RANEPA, groups: ['БИ-3-24-04'] }))
  })

  it('shows the delete-import button only when an import exists', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ imports: [] })
    renderPage()
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledWith('/ranepa/status'))

    expect(screen.queryByRole('button', { name: 'Удалить импорт' })).not.toBeInTheDocument()
  })

  it('deletes the imported schedule on confirmation', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      imports: [{ url: URL_RANEPA, groupName: 'БИ-4-26-02', syncedAt: new Date().toISOString(), groups: [] }],
    })
    vi.mocked(api.delete).mockResolvedValue(undefined)
    useStore.setState({
      lessons: [
        { id: 'imp1', title: 'Импортированная', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: URL_RANEPA },
        { id: 'man1', title: 'Моя пара', type: 'weekly', weekday: 1, startTime: '09:00', endTime: '10:30' },
      ],
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Удалить импорт' }))

    await vi.waitFor(() => expect(api.delete).toHaveBeenCalledWith('/ranepa/import'))
    expect(useStore.getState().lessons.map((l) => l.title)).toEqual(['Моя пара'])
    expect(showToastMock).toHaveBeenCalledWith('Импортированное расписание удалено')
    expect(screen.queryByRole('button', { name: 'Удалить импорт' })).not.toBeInTheDocument()
  })

  it('imports a schedule through the modal and applies the lessons', async () => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ imports: [] })
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        groupName: 'БИ-4-26-02',
        count: 1,
        firstDate: '2026-09-04',
        lastDate: '2026-09-04',
        lessons: [],
      })
      .mockResolvedValueOnce({
        groupName: 'БИ-4-26-02',
        count: 1,
        lessons: [{ id: 'imp7', title: 'Пара из РАНХиГС', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: URL_RANEPA }],
      })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Импорт из РАНХиГС' }))
    await user.type(screen.getByLabelText(/ссылка на расписание/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))
    await user.click(await screen.findByRole('button', { name: 'Импортировать' }))

    await vi.waitFor(() => expect(useStore.getState().lessons.some((l) => l.sourceUrl === URL_RANEPA)).toBe(true))
    expect(screen.queryByLabelText(/ссылка на расписание/i)).not.toBeInTheDocument()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
