import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotesPage from './NotesPage'
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

const base = {
  lessons: [],
  tasks: [],
  deadlines: [],
  focusSessions: [],
  settings: { theme: 'system' as const, pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  const now = new Date().toISOString()
  useStore.setState({
    ...base,
    notes: [
      { id: '1', title: 'Формулы по алгебре', subject: 'Математика', content: 'Квадратное уравнение', tags: ['математика'], pinned: true, createdAt: now, updatedAt: now },
      { id: '2', title: 'План сочинения', subject: 'Русский', content: 'Вступление, тезис', tags: ['русский'], pinned: false, createdAt: now, updatedAt: now },
    ],
  })
})

describe('NotesPage', () => {
  it('shows all notes', () => {
    renderPage()
    expect(screen.getByText('Формулы по алгебре')).toBeInTheDocument()
    expect(screen.getByText('План сочинения')).toBeInTheDocument()
  })

  it('searches by title', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByPlaceholderText('Поиск по заметкам…'), 'сочинения')
    expect(screen.queryByText('Формулы по алгебре')).not.toBeInTheDocument()
    expect(screen.getByText('План сочинения')).toBeInTheDocument()
  })

  it('adds a note', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
    await user.type(screen.getByLabelText('Заголовок'), 'Идеи для проекта')
    await user.type(screen.getByLabelText('Содержимое'), 'Первый пункт')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().notes).toHaveLength(3)
    expect(screen.getByText('Идеи для проекта')).toBeInTheDocument()
  })

  it('pins and unpins a note', async () => {
    const user = userEvent.setup()
    renderPage()
    const card = screen.getByText('План сочинения').closest('li') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Закрепить' }))
    const note = useStore.getState().notes.find((n) => n.id === '2')
    expect(note?.pinned).toBe(true)
  })
})

describe('NotesPage markdown view', () => {
  const mdNote = () => ({
    id: '3',
    title: 'Конспект по ТС',
    subject: 'Информатика',
    content: '# Вступление',
    tags: [] as string[],
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  it('opens the note view on card click and renders markdown', async () => {
    const user = userEvent.setup()
    useStore.setState({ ...base, notes: [mdNote()] })
    renderPage()
    await user.click(screen.getByText('Конспект по ТС'))
    expect(screen.getByRole('heading', { name: 'Вступление', level: 1 })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Редактировать' })).toBeInTheDocument()
  })

  it('opens the edit form from the note view', async () => {
    const user = userEvent.setup()
    useStore.setState({ ...base, notes: [mdNote()] })
    renderPage()
    await user.click(screen.getByText('Конспект по ТС'))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Редактировать' }))
    expect(screen.getByLabelText('Заголовок')).toHaveValue('Конспект по ТС')
  })
})
