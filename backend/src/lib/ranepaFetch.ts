const RANEPA_HOST = 'spb.ranepa.ru'

export function isValidRanepaUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && u.hostname === RANEPA_HOST && u.pathname.startsWith('/raspisanie/')
  } catch {
    return false
  }
}

export async function fetchSchedulePage(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
    headers: { 'User-Agent': 'StudyDashboard/0.1 (student schedule import)' },
  })
  if (!res.ok) {
    throw new Error(`РАНХиГС ответил статусом ${res.status}, попробуйте позже`)
  }
  const finalUrl = new URL(res.url)
  if (finalUrl.hostname !== RANEPA_HOST) {
    throw new Error('Ссылка ведёт за пределы spb.ranepa.ru')
  }
  return res.text()
}
