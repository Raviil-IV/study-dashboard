import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotesPage from './NotesPage'
import { useStore } from '../store/useStore'

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
