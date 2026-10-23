const RANEPA_HOST = 'spb.ranepa.ru'
const MAX_REDIRECTS = 3
export const MAX_SCHEDULE_BYTES = 2 * 1024 * 1024

const OUT_OF_HOST_MESSAGE = 'Ссылка ведёт за пределы spb.ranepa.ru'
const TOO_MANY_REDIRECTS_MESSAGE = 'Слишком много перенаправлений'
const TOO_LARGE_MESSAGE = 'Страница расписания слишком большая'
const BAD_REDIRECT_MESSAGE = 'РАНХиГС вернул некорректную ссылку перенаправления'

export function isValidRanepaUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && u.hostname === RANEPA_HOST && u.pathname.startsWith('/raspisanie/')
  } catch {
    return false
  }
}

function statusError(status: number): Error {
  return new Error(`РАНХиГС ответил статусом ${status}, попробуйте позже`)
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400
}

function parseRedirectLocation(location: string, base: string): URL {
  try {
    return new URL(location, base)
  } catch {
    throw new Error(BAD_REDIRECT_MESSAGE)
  }
}

async function readCappedBody(res: Response): Promise<string> {
  const declaredLength = res.headers.get('content-length')
  if (declaredLength !== null && Number(declaredLength) > MAX_SCHEDULE_BYTES) {
    throw new Error(TOO_LARGE_MESSAGE)
  }
  if (!res.body) return ''

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_SCHEDULE_BYTES) {
      await reader.cancel()
      throw new Error(TOO_LARGE_MESSAGE)
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export async function fetchSchedulePage(url: string): Promise<string> {
  // Один таймаут на всю цепочку перенаправлений.
  const signal = AbortSignal.timeout(10_000)
  let currentUrl = url
  let redirects = 0

  for (;;) {
    const res = await fetch(currentUrl, {
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': 'StudyDashboard/0.1 (student schedule import)' },
    })

    if (isRedirect(res.status)) {
      if (redirects >= MAX_REDIRECTS) {
        throw new Error(TOO_MANY_REDIRECTS_MESSAGE)
      }
      const location = res.headers.get('location')
      if (!location) {
        throw statusError(res.status)
      }
      const next = parseRedirectLocation(location, currentUrl)
      if (next.protocol !== 'https:' || next.hostname !== RANEPA_HOST) {
        throw new Error(OUT_OF_HOST_MESSAGE)
      }
      currentUrl = next.toString()
      redirects += 1
      continue
    }

    if (!res.ok) {
      throw statusError(res.status)
    }
    return readCappedBody(res)
  }
}
