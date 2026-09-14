import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteForm from './NoteForm'

const note = {
  id: '1',
  title: 'Конспект',
  subject: '',
  content: '# Параграф\n\n- пункт',
  tags: [] as string[],
  pinned: false,
  createdAt: '',
  updatedAt: '',
}

describe('NoteForm', () => {
  it('shows the markdown preview via the mobile tab switch', async () => {
    const user = userEvent.setup()
    render(<NoteForm initial={note} onSubmit={() => {}} onCancel={() => {}} />)
    // jsdom matchMedia always reports false → mobile branch: tabs are visible
    expect(screen.getByLabelText('Содержимое')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }))
    expect(screen.getByRole('heading', { name: 'Параграф', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('пункт')).toBeInTheDocument()
  })
})
