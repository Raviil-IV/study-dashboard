import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Toaster from './Toaster'
import { useToast } from '../../lib/toast'

beforeEach(() => {
  useToast.getState().hide()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Toaster', () => {
  it('renders nothing when there is no message', () => {
    render(<Toaster />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the toast message and hides it after 4 seconds', () => {
    vi.useFakeTimers()
    useToast.getState().show('Сессия истекла, войдите снова')
    render(<Toaster />)

    expect(screen.getByRole('alert')).toHaveTextContent('Сессия истекла, войдите снова')

    act(() => {
      vi.advanceTimersByTime(3999)
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
