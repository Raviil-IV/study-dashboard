import { render, screen } from '@testing-library/react'
import App from './App'

test('renders placeholder', () => {
  render(<App />)
  expect(screen.getByText('Study Dashboard')).toBeInTheDocument()
})
