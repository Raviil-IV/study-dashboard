import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

test('renders nothing when closed', () => {
  render(<Modal open={false} title="Тест" onClose={() => {}}>контент</Modal>)
  expect(screen.queryByText('контент')).not.toBeInTheDocument()
})

test('renders content and calls onClose on overlay click', async () => {
  const onClose = vi.fn()
  render(<Modal open title="Заголовок" onClose={onClose}>контент</Modal>)
  expect(screen.getByText('Заголовок')).toBeInTheDocument()
  expect(screen.getByText('контент')).toBeInTheDocument()
  await userEvent.click(screen.getByTestId('modal-overlay'))
  expect(onClose).toHaveBeenCalled()
})

test('supports size prop and dialog semantics', () => {
  render(<Modal open title="Заголовок" size="4xl" onClose={() => {}}>контент</Modal>)
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveClass('max-w-4xl')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
})
