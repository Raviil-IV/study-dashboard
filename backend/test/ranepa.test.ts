import { beforeEach, describe, expect, it, vi } from 'vitest'
import type request from 'supertest'
import { createAgent, signUp } from './helpers'

vi.mock('../src/lib/ranepaFetch', () => ({
  fetchSchedulePage: vi.fn(),
  isValidRanepaUrl: vi.fn((url: string) => {
    try {
      const u = new URL(url)
      return u.protocol === 'https:' && u.hostname === 'spb.ranepa.ru' && u.pathname.startsWith('/raspisanie/')
    } catch {
      return false
    }
  }),
}))

import { fetchSchedulePage } from '../src/lib/ranepaFetch'

const URL_A = 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/'

const row = (cells: string[]): string =>
  `<tr>${cells.map((c, i) => `<td class="column-${i + 1}">${c}</td>`).join('')}</tr>`

function page(rows: string): string {
  return `<html><head><title>БИ-4-26-02 СЕМЕСТР</title></head><body>
<table id="tablepress-1" class="tablepress"><thead><tr>${Array.from({ length: 10 }, (_, i) => `<th class="column-${i + 1}"></th>`).join('')}</tr></thead>
<tbody>${rows}</tbody></table></body></html>`
}

const htmlA = page(
  row(['Пт.', '04', '09', '18.30-19.50', 'БИ-4-26-02', 'К', 'Консультация', '<em>доц.</em>', '<em>Гурьева Т.Н.</em>', '311']) +
    row(['Ср.', '09', '09', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Оценка проектов', '<em>проф.</em>', '<em>Куклина Е.А.</em>', '311']) +
    row(['Пн.', '310', '10', '18.30-21.20', 'БИ-4-26-02', 'ПЗ', 'Социология', '<em>доц.</em>', '<em>Киселев Н.Е.</em>', '']),
)

const htmlB = page(row(['Пн.', '14', '09', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Новое занятие', '<em>доц.</em>', '<em>Санжарова О.Н.</em>', 'СДО']))

const htmlC = page(
  row(['Пн.', '01', '09', '18.30-21.20', 'БИ-3-24-04', 'Л', 'Пара только 04', '', '', '']) +
    row(['Пн.', '01', '09', '18.30-21.20', 'БИ-3-24-03', 'Л', 'Пара только 03', '', '', '']) +
    row(['Пн.', '01', '09', '18.30-21.20', 'БИ-3-24-03-04', 'Л', 'Общая пара', '', '', '']) +
    row(['Пн.', '310', '10', '18.30-21.20', 'БИ-3-24-04', 'ПЗ', 'Битая пара 04', '', '', '']),
)

let agent: ReturnType<typeof request.agent>

beforeEach(async () => {
  agent = createAgent()
  await signUp(agent)
  vi.mocked(fetchSchedulePage).mockReset()
})

describe('ranepa import', () => {
  it('requires auth', async () => {
    const anon = createAgent()
    const res = await anon.post('/api/ranepa/preview').send({ url: URL_A })
    expect(res.status).toBe(401)
  })

  it('preview parses the page without saving lessons', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)

    const res = await agent.post('/api/ranepa/preview').send({ url: URL_A })

    expect(res.status).toBe(200)
    expect(res.body.groupName).toBe('БИ-4-26-02')
    expect(res.body.count).toBe(2)
    expect(res.body.lessons[0]).toMatchObject({
      date: '2026-09-04',
      startTime: '18:30',
      endTime: '19:50',
      title: 'Консультация',
      teacher: 'доц. Гурьева Т.Н.',
      location: '311',
    })
    // Строка с опечаткой «310» попадает в invalid, а не в занятия
    expect(res.body.invalid).toHaveLength(1)
    expect(res.body.invalid[0]).toMatchObject({
      title: 'Социология',
      rawDay: '310',
      rawMonth: '10',
      reason: 'malformed',
    })

    const state = await agent.get('/api/state')
    expect(state.body.lessons).toEqual([])
  })

  it('preview rejects invalid urls with 400', async () => {
    const res = await agent.post('/api/ranepa/preview').send({ url: 'https://evil.com/raspisanie/x/' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION')
  })

  it('returns 502 when the university site is unreachable', async () => {
    vi.mocked(fetchSchedulePage).mockRejectedValue(new Error('РАНХиГС ответил статусом 503, попробуйте позже'))

    const res = await agent.post('/api/ranepa/preview').send({ url: URL_A })

    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('UPSTREAM')
  })

  it('import creates once-lessons with sourceUrl and registers the source', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)

    const res = await agent.post('/api/ranepa/import').send({ url: URL_A })

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(2)
    expect(res.body.lessons).toHaveLength(2)
    expect(res.body.lessons[0]).toMatchObject({
      type: 'once',
      date: '2026-09-04',
      startTime: '18:30',
      endTime: '19:50',
      title: 'Консультация',
      location: '311',
      note: 'К · доц. Гурьева Т.Н.',
      sourceUrl: URL_A,
    })

    const status = await agent.get('/api/ranepa/status')
    expect(status.status).toBe(200)
    expect(status.body.imports).toHaveLength(1)
    expect(status.body.imports[0]).toMatchObject({ url: URL_A, groupName: 'БИ-4-26-02' })
    expect(status.body.imports[0].syncedAt).toBeTruthy()

    const state = await agent.get('/api/state')
    expect(state.body.lessons).toHaveLength(2)
    expect(state.body.lessons.every((l: { sourceUrl: string }) => l.sourceUrl === URL_A)).toBe(true)
  })

  it('re-import replaces only the previously imported lessons', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)
    await agent.post('/api/ranepa/import').send({ url: URL_A })
    await agent.post('/api/lessons').send({
      title: 'Моя пара',
      type: 'weekly',
      weekday: 1,
      startTime: '09:00',
      endTime: '10:30',
    })

    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlB)
    const res = await agent.post('/api/ranepa/import').send({ url: URL_A })

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(1)
    expect(res.body.lessons[0].title).toBe('Новое занятие')

    const state = await agent.get('/api/state')
    expect(state.body.lessons).toHaveLength(2)
    const imported = state.body.lessons.filter((l: { sourceUrl?: string }) => l.sourceUrl)
    const manual = state.body.lessons.filter((l: { sourceUrl?: string }) => !l.sourceUrl)
    expect(imported).toHaveLength(1)
    expect(imported[0].title).toBe('Новое занятие')
    expect(manual).toHaveLength(1)
    expect(manual[0].title).toBe('Моя пара')
  })

  it('import with fixes adds corrected lessons with the chosen dates', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)

    const res = await agent.post('/api/ranepa/import').send({ url: URL_A, fixes: [{ index: 0, date: '2026-10-31' }] })

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(3) // 2 корректных + 1 исправленная
    const fixed = res.body.lessons.find((l: { title: string }) => l.title === 'Социология')
    expect(fixed).toMatchObject({
      date: '2026-10-31',
      weekday: 6, // 31.10.2026 — суббота
      startTime: '18:30',
      endTime: '21:20',
      note: 'ПЗ · доц. Киселев Н.Е.',
      sourceUrl: URL_A,
    })
  })

  it('import without fixes skips rows with broken dates', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)

    const res = await agent.post('/api/ranepa/import').send({ url: URL_A })

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(2)
    expect(res.body.lessons.some((l: { title: string }) => l.title === 'Социология')).toBe(false)
  })

  it('import rejects fixes with dates that do not exist', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)

    const res = await agent.post('/api/ranepa/import').send({ url: URL_A, fixes: [{ index: 0, date: '2026-02-30' }] })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION')
  })

  it('preview returns group variants with counts', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlC)

    const res = await agent.post('/api/ranepa/preview').send({ url: URL_A })

    expect(res.status).toBe(200)
    expect(res.body.groups).toEqual([
      { rawGroup: 'БИ-3-24-04', count: 1, invalidCount: 1 },
      { rawGroup: 'БИ-3-24-03', count: 1, invalidCount: 0 },
      { rawGroup: 'БИ-3-24-03-04', count: 1, invalidCount: 0 },
    ])
    expect(res.body.invalid[0].rawGroup).toBe('БИ-3-24-04')
  })

  it('import filters lessons by the selected raw groups', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlC)

    const res = await agent.post('/api/ranepa/import').send({ url: URL_A, groups: ['БИ-3-24-04', 'БИ-3-24-03-04'] })

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(2)
    expect(res.body.lessons.map((l: { title: string }) => l.title).sort()).toEqual(['Общая пара', 'Пара только 04'])
  })

  it('import without groups imports everything', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlC)

    const res = await agent.post('/api/ranepa/import').send({ url: URL_A })

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(3)
  })

  it('import applies fixes only to invalid rows of selected groups', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlC)

    const res = await agent
      .post('/api/ranepa/import')
      .send({ url: URL_A, groups: ['БИ-3-24-03'], fixes: [{ index: 0, date: '2026-10-31' }] })

    expect(res.status).toBe(200)
    // Битая пара относится к БИ-3-24-04 — не входит в выбранные группы, fix игнорируется
    expect(res.body.count).toBe(1)
    expect(res.body.lessons[0].title).toBe('Пара только 03')
  })

  it('status returns the groups stored during import', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlC)
    await agent.post('/api/ranepa/import').send({ url: URL_A, groups: ['БИ-3-24-04'] })

    const status = await agent.get('/api/ranepa/status')

    expect(status.status).toBe(200)
    expect(status.body.imports[0]).toMatchObject({ url: URL_A, groups: ['БИ-3-24-04'] })
  })

  it('importing a different url replaces all previously imported lessons', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)
    await agent.post('/api/ranepa/import').send({ url: URL_A })
    await agent.post('/api/lessons').send({
      title: 'Моя пара',
      type: 'weekly',
      weekday: 1,
      startTime: '09:00',
      endTime: '10:30',
    })

    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlB)
    const res = await agent.post('/api/ranepa/import').send({ url: 'https://spb.ranepa.ru/raspisanie/bi-3-24-03-04-semestr/' })

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(1)

    const state = await agent.get('/api/state')
    expect(state.body.lessons).toHaveLength(2)
    const imported = state.body.lessons.filter((l: { sourceUrl?: string }) => l.sourceUrl)
    const manual = state.body.lessons.filter((l: { sourceUrl?: string }) => !l.sourceUrl)
    expect(imported).toHaveLength(1)
    expect(imported[0].title).toBe('Новое занятие')
    expect(manual[0].title).toBe('Моя пара')

    const status = await agent.get('/api/ranepa/status')
    expect(status.body.imports).toHaveLength(1)
    expect(status.body.imports[0].url).toBe('https://spb.ranepa.ru/raspisanie/bi-3-24-03-04-semestr/')
  })

  it('DELETE /import removes all imported lessons and sources but keeps manual ones', async () => {
    vi.mocked(fetchSchedulePage).mockResolvedValue(htmlA)
    await agent.post('/api/ranepa/import').send({ url: URL_A })
    await agent.post('/api/lessons').send({
      title: 'Моя пара',
      type: 'weekly',
      weekday: 1,
      startTime: '09:00',
      endTime: '10:30',
    })

    const res = await agent.delete('/api/ranepa/import')

    expect(res.status).toBe(204)

    const state = await agent.get('/api/state')
    expect(state.body.lessons).toHaveLength(1)
    expect(state.body.lessons[0].title).toBe('Моя пара')

    const status = await agent.get('/api/ranepa/status')
    expect(status.body.imports).toEqual([])
  })

  it('DELETE /import requires auth', async () => {
    const anon = createAgent()
    const res = await anon.delete('/api/ranepa/import')
    expect(res.status).toBe(401)
  })
})
