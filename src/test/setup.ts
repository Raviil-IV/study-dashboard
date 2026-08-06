import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest's jsdom env shadows window.localStorage with Node's webstorage
// accessor (returns undefined without --experimental-webstorage flag).
// Restore jsdom's real Storage instance.
const win = window as unknown as { localStorage?: Storage; _localStorage?: Storage }
if (!win.localStorage && win._localStorage) {
  Object.defineProperty(win, 'localStorage', {
    value: win._localStorage,
    writable: true,
    configurable: true,
  })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
