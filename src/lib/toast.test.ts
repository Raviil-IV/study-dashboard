import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { notifyError, useToast } from './toast'

beforeEach(() => {
  useToast.getState().hide()
})

describe('notifyError', () => {
  it('ignores a 401 ApiError and leaves the message unset', () => {
    notifyError(new ApiError(401, 'UNAUTHORIZED', 'Требуется вход'))
    expect(useToast.getState().message).toBeNull()
  })

  it('does not overwrite the session-expired notice with a 401 ApiError', () => {
    useToast.getState().show('Сессия истекла, войдите снова')
    notifyError(new ApiError(401, 'UNAUTHORIZED', 'Требуется вход'))
    expect(useToast.getState().message).toBe('Сессия истекла, войдите снова')
  })

  it('shows the message of any other error', () => {
    notifyError(new ApiError(500, 'INTERNAL', 'x'))
    expect(useToast.getState().message).toBe('x')
  })
})
