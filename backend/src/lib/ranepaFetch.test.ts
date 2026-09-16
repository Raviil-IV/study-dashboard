import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchSchedulePage, isValidRanepaUrl } from './ranepaFetch'

describe('isValidRanepaUrl', () => {
  it('accepts https schedule pages on spb.ranepa.ru', () => {
    expect(isValidRanepaUrl('https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/')).toBe(true)
  })

  it('rejects other hosts, protocols and paths', () => {
    expect(isValidRanepaUrl('http://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/')).toBe(false)
    expect(isValidRanepaUrl('https://evil.com/raspisanie/x/')).toBe(false)
    expect(isValidRanepaUrl('https://spb.ranepa.ru/about/')).toBe(false)
    expect(isValidRanepaUrl('https://ranepa.ru/raspisanie/x/')).toBe(false)
    expect(isValidRanepaUrl('не ссылка')).toBe(false)
  })
})

function responseWithUrl(body: string, status: number, url: string): Response {
  const res = new Response(body, { status })
  Reflect.defineProperty(res, 'url', { value: url })
  return res
}

describe('fetchSchedulePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the html body of a schedule page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseWithUrl('<html>расписание</html>', 200, 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/')),
    )

    const html = await fetchSchedulePage('https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/')

    expect(html).toBe('<html>расписание</html>')
  })

  it('throws when the site responds with an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseWithUrl('error', 500, 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/')),
    )

    await expect(fetchSchedulePage('https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/')).rejects.toThrow('500')
  })

  it('throws when a redirect leads off spb.ranepa.ru', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseWithUrl('<html>x</html>', 200, 'https://evil.com/x')))

    await expect(fetchSchedulePage('https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/')).rejects.toThrow('пределы')
  })
})
