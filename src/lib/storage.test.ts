import { describe, expect, it, beforeEach } from 'vitest'
import { loadFromStorage, saveToStorage } from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('returns fallback when key is missing', () => {
    expect(loadFromStorage('study-dashboard:missing', ['x'])).toEqual(['x'])
  })

  it('round-trips saved JSON', () => {
    saveToStorage('study-dashboard:lessons', [{ id: '1' }])
    expect(loadFromStorage('study-dashboard:lessons', [])).toEqual([{ id: '1' }])
  })

  it('returns fallback on corrupted JSON', () => {
    localStorage.setItem('study-dashboard:lessons', '{broken')
    expect(loadFromStorage('study-dashboard:lessons', [])).toEqual([])
  })
})
