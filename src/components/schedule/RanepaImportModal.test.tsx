import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RanepaImportModal from './RanepaImportModal'
import type { RanepaImportStatus } from '../../types'

const { postMock, notifyErrorMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  notifyErrorMock: vi.fn(),
}))

vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: postMock, patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../lib/toast', () => ({ notifyError: notifyErrorMock, useToast: { getState: () => ({ show: vi.fn() }) } }))

const URL_RANEPA = 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/'

beforeEach(() => {
  vi.clearAllMocks()
})

function renderModal(existing: RanepaImportStatus | null = null) {
  const onClose = vi.fn()
  const onImported = vi.fn()
  render(<RanepaImportModal existing={existing} onClose={onClose} onImported={onImported} />)
  return { onClose, onImported }
}

describe('RanepaImportModal', () => {
  it('shows the url input and prefills it from an existing import', async () => {
    renderModal({ url: URL_RANEPA, groupName: 'БИ-4-26-02', syncedAt: '2026-09-01T00:00:00.000Z', groups: [] })

    expect(screen.getByLabelText(/ссылка/i)).toHaveValue(URL_RANEPA)
  })

  it('loads a preview and shows group, count and period', async () => {
    postMock.mockResolvedValue({
      groupName: 'БИ-4-26-02',
      count: 2,
      firstDate: '2026-09-04',
      lastDate: '2026-12-28',
      lessons: [],
    })
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))

    expect(postMock).toHaveBeenCalledWith('/ranepa/preview', { url: URL_RANEPA })
    expect(await screen.findByText('БИ-4-26-02')).toBeInTheDocument()
    expect(screen.getByText(/2 занятия/)).toBeInTheDocument()
    expect(screen.getByText(/04\.09\.2026 — 28\.12\.2026/)).toBeInTheDocument()
  })

  it('imports the schedule and reports the new lessons', async () => {
    postMock.mockResolvedValueOnce({
      groupName: 'БИ-4-26-02',
      count: 1,
      firstDate: '2026-09-04',
      lastDate: '2026-09-04',
      lessons: [{ title: 'Пара' }],
    })
    postMock.mockResolvedValueOnce({
      groupName: 'БИ-4-26-02',
      count: 1,
      lessons: [{ id: 'l1', title: 'Пара', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: URL_RANEPA }],
    })
    const user = userEvent.setup()
    const { onImported } = renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))
    await user.click(await screen.findByRole('button', { name: 'Импортировать' }))

    expect(postMock).toHaveBeenLastCalledWith('/ranepa/import', { url: URL_RANEPA })
    expect(onImported).toHaveBeenCalledWith(URL_RANEPA, [{ id: 'l1', title: 'Пара', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: URL_RANEPA }])
  })

  it('labels the confirm button «Обновить» when an import already exists', async () => {
    postMock.mockResolvedValue({ groupName: 'БИ-4-26-02', count: 1, firstDate: '2026-09-04', lastDate: '2026-09-04', lessons: [] })
    const user = userEvent.setup()
    renderModal({ url: URL_RANEPA, groupName: 'БИ-4-26-02', syncedAt: '2026-09-01T00:00:00.000Z', groups: [] })

    await user.click(screen.getByRole('button', { name: 'Загрузить' }))

    expect(await screen.findByRole('button', { name: 'Обновить' })).toBeInTheDocument()
  })

  it('shows a message and hides the import button when the page has no lessons', async () => {
    postMock.mockResolvedValue({ groupName: '', count: 0, lessons: [] })
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))

    expect(await screen.findByText(/не найдено/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Импортировать' })).not.toBeInTheDocument()
  })

  it('shows an error toast when the preview fails', async () => {
    postMock.mockRejectedValue(new Error('Ссылка должна вести на страницу расписания'))
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), 'https://evil.com/x/')
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))

    expect(await vi.waitFor(() => notifyErrorMock.mock.calls.length)).toBeGreaterThan(0)
    expect(notifyErrorMock.mock.calls[0][0].message).toBe('Ссылка должна вести на страницу расписания')
  })

  it('shows a fix-dates button when the preview contains invalid lessons', async () => {
    postMock.mockResolvedValue({
      groupName: 'БИ-4-26-02',
      count: 1,
      firstDate: '2026-09-04',
      lastDate: '2026-09-04',
      lessons: [],
      invalid: [{ title: 'Социология', startTime: '18:30', endTime: '21:20', rawDay: '310', rawMonth: '10', reason: 'malformed' }],
    })
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))

    expect(await screen.findByText(/1 занятие с некорректной датой/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Исправить даты' })).toBeInTheDocument()
  })

  it('sends fixed dates with the import', async () => {
    postMock.mockResolvedValueOnce({
      groupName: 'БИ-4-26-02',
      count: 1,
      firstDate: '2026-09-04',
      lastDate: '2026-09-04',
      lessons: [],
      invalid: [{ title: 'Социология', startTime: '18:30', endTime: '21:20', rawDay: '310', rawMonth: '10', reason: 'malformed' }],
    })
    postMock.mockResolvedValueOnce({ groupName: 'БИ-4-26-02', count: 2, lessons: [] })
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))
    await user.click(await screen.findByRole('button', { name: 'Исправить даты' }))

    fireEvent.change(screen.getByLabelText(/дата/i), { target: { value: '2026-10-31' } })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await user.click(screen.getByRole('button', { name: 'Импортировать' }))

    expect(postMock).toHaveBeenLastCalledWith('/ranepa/import', {
      url: URL_RANEPA,
      fixes: [{ index: 0, date: '2026-10-31' }],
    })
  })

  it('shows group variants and disables import until at least one is selected', async () => {
    postMock.mockResolvedValue({
      groupName: 'БИ-3-24-03-04',
      count: 3,
      lessons: [],
      invalid: [],
      groups: [
        { rawGroup: 'БИ-3-24-04', count: 1, invalidCount: 0 },
        { rawGroup: 'БИ-3-24-03', count: 1, invalidCount: 0 },
        { rawGroup: 'БИ-3-24-03-04', count: 1, invalidCount: 0 },
      ],
    })
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))

    expect(await screen.findByText(/Группы: 3 варианта · выбрано: 0/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Импортировать' })).toBeDisabled()
  })

  it('sends the selected groups with the import', async () => {
    postMock.mockResolvedValueOnce({
      groupName: 'БИ-3-24-03-04',
      count: 3,
      lessons: [],
      invalid: [],
      groups: [
        { rawGroup: 'БИ-3-24-04', count: 1, invalidCount: 0 },
        { rawGroup: 'БИ-3-24-03', count: 1, invalidCount: 0 },
        { rawGroup: 'БИ-3-24-03-04', count: 1, invalidCount: 0 },
      ],
    })
    postMock.mockResolvedValueOnce({ groupName: 'БИ-3-24-03-04', count: 2, lessons: [] })
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))
    await user.click(await screen.findByRole('button', { name: 'Выбрать группы' }))
    await user.click(screen.getByRole('checkbox', { name: 'БИ-3-24-04' }))
    await user.click(screen.getByRole('checkbox', { name: 'БИ-3-24-03-04' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await user.click(screen.getByRole('button', { name: 'Импортировать' }))

    expect(postMock).toHaveBeenLastCalledWith('/ranepa/import', {
      url: URL_RANEPA,
      groups: ['БИ-3-24-04', 'БИ-3-24-03-04'],
    })
  })

  it('shows only invalid lessons of the selected groups in the fix window', async () => {
    postMock.mockResolvedValue({
      groupName: 'БИ-3-24-03-04',
      count: 2,
      lessons: [],
      invalid: [
        { title: 'Битая 04', startTime: '18:30', endTime: '21:20', rawDay: '310', rawMonth: '10', reason: 'malformed', rawGroup: 'БИ-3-24-04' },
        { title: 'Битая 03', startTime: '18:30', endTime: '21:20', rawDay: '310', rawMonth: '10', reason: 'malformed', rawGroup: 'БИ-3-24-03' },
      ],
      groups: [
        { rawGroup: 'БИ-3-24-04', count: 1, invalidCount: 1 },
        { rawGroup: 'БИ-3-24-03', count: 1, invalidCount: 1 },
      ],
    })
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText(/ссылка/i), URL_RANEPA)
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))
    await user.click(await screen.findByRole('button', { name: 'Выбрать группы' }))
    await user.click(screen.getByRole('checkbox', { name: 'БИ-3-24-04' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await user.click(screen.getByRole('button', { name: 'Исправить даты' }))

    expect(screen.getByText('Битая 04')).toBeInTheDocument()
    expect(screen.queryByText('Битая 03')).not.toBeInTheDocument()
  })

  it('warns that the current import will be replaced when loading a different url', async () => {
    postMock.mockResolvedValue({ groupName: 'БИ-4-26-02', count: 1, lessons: [], invalid: [], groups: [] })
    const user = userEvent.setup()
    renderModal({ url: 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/', groupName: 'БИ-4-26-02', syncedAt: '2026-09-01T00:00:00.000Z', groups: [] })

    await user.clear(screen.getByLabelText(/ссылка/i))
    await user.type(screen.getByLabelText(/ссылка/i), 'https://spb.ranepa.ru/raspisanie/bi-3-24-03-04-semestr/')
    await user.click(screen.getByRole('button', { name: 'Загрузить' }))

    expect(await screen.findByText(/Текущее импортированное расписание будет заменено/)).toBeInTheDocument()
  })
})
