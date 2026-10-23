import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchSchedulePage, isValidRanepaUrl, MAX_SCHEDULE_BYTES } from './ranepaFetch'

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

const HOME = 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/'

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, { status })
}

function redirectResponse(status: number, location: string): Response {
  return new Response(null, { status, headers: { location } })
}

describe('fetchSchedulePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the html body of a schedule page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('<html>расписание</html>')))

    const html = await fetchSchedulePage(HOME)

    expect(html).toBe('<html>расписание</html>')
  })

  it('throws when the site responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('error', 500)))

    await expect(fetchSchedulePage(HOME)).rejects.toThrow('500')
  })

  it('rejects a redirect that leads off spb.ranepa.ru', async () => {
    const fetchMock = vi.fn().mockResolvedValue(redirectResponse(302, 'https://evil.example/x'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchSchedulePage(HOME)).rejects.toThrow('Ссылка ведёт за пределы spb.ranepa.ru')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a redirect with an unparseable Location header', async () => {
    // Relative resolution keeps "ht!tp://%%%" valid, so use a value that really throws.
    const location = 'http://%%%'
    expect(() => new URL(location, HOME)).toThrow(TypeError)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirectResponse(302, location)))

    await expect(fetchSchedulePage(HOME)).rejects.toThrow('РАНХиГС вернул некорректную ссылку перенаправления')
  })

  it('follows redirects within spb.ranepa.ru', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse(301, '/raspisanie/bi-3-24-03-04-semestr/'))
      .mockResolvedValueOnce(htmlResponse('<html>расписание</html>'))
    vi.stubGlobal('fetch', fetchMock)

    const html = await fetchSchedulePage(HOME)

    expect(html).toBe('<html>расписание</html>')
    expect(fetchMock.mock.calls[1][0]).toBe('https://spb.ranepa.ru/raspisanie/bi-3-24-03-04-semestr/')
  })

  it('rejects more than three redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(redirectResponse(302, 'https://spb.ranepa.ru/raspisanie/next/'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchSchedulePage(HOME)).rejects.toThrow('Слишком много перенаправлений')
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('rejects a 3xx response without a Location header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302 })))

    await expect(fetchSchedulePage(HOME)).rejects.toThrow('статусом 302')
  })

  it('rejects a body larger than the size cap', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('a'.repeat(MAX_SCHEDULE_BYTES + 1))))

    await expect(fetchSchedulePage(HOME)).rejects.toThrow('Страница расписания слишком большая')
  })

  it('rejects a response whose Content-Length exceeds the size cap', async () => {
    const res = htmlResponse('small')
    res.headers.set('content-length', String(MAX_SCHEDULE_BYTES + 1))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))

    await expect(fetchSchedulePage(HOME)).rejects.toThrow('Страница расписания слишком большая')
  })
})
