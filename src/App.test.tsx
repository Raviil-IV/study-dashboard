import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('renders nav labels', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getAllByText('Study Dashboard').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Главная').length).toBeGreaterThan(0)
})
