import { describe, expect, it } from 'vitest'
import { parseScheduleHtml } from './ranepa'

const row = (cells: string[]): string =>
  `<tr>${cells.map((c, i) => `<td class="column-${i + 1}">${c}</td>`).join('')}</tr>`

function page(rows: string): string {
  return `<html><head><title>БИ-4-26-02 СЕМЕСТР &#8212; Академия</title></head><body>
<table id="tablepress-14806" class="tablepress tablepress-id-14806">
<thead><tr><th class="column-1"></th><th class="column-2"></th><th class="column-3"></th><th class="column-4"></th><th class="column-5"></th><th class="column-6"></th><th class="column-7"></th><th class="column-8"></th><th class="column-9"></th><th class="column-10"></th></tr></thead>
<tbody class="row-hover">${rows}</tbody>
</table></body></html>`
}

// 2026-08-15 — середина лета, перед началом осеннего семестра 2026/27
const NOW = new Date(2026, 7, 15)

describe('parseScheduleHtml', () => {
  it('parses semester rows into lessons with normalized time and date', () => {
    const html = page(
      row(['Пт.', '04', '09', '18.30-19.50', 'БИ-4-26-02', 'К', 'КОНСУЛЬТАЦИЯ: Научно-исследовательская работа 01.09.2026-11.06.2027', '<em>доц.</em>', '<em>Гурьева Т.Н.</em>', '311']) +
        row(['Ср.', '09', '09', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Оценка и управление инвестиционным проектом', '<em>проф.</em>', '<em>Куклина Е.А.</em>', '311']) +
        row(['Пн.', '14', '09', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Деловой английский язык в IT-сфере', '<em>доц.</em>', '<em>Санжарова О.Н.</em>', 'СДО РАНХиГС']),
    )

    const result = parseScheduleHtml(html, NOW)

    expect(result.groupName).toBe('БИ-4-26-02')
    expect(result.lessons).toHaveLength(3)

    expect(result.lessons[0]).toEqual({
      date: '2026-09-04',
      weekday: 5, // Пт.
      startTime: '18:30',
      endTime: '19:50',
      title: 'КОНСУЛЬТАЦИЯ: Научно-исследовательская работа 01.09.2026-11.06.2027',
      type: 'К',
      teacher: 'доц. Гурьева Т.Н.',
      location: '311',
      rawGroup: 'БИ-4-26-02',
    })
    expect(result.lessons[1].date).toBe('2026-09-09')
    expect(result.lessons[1].weekday).toBe(3) // Ср.
    expect(result.lessons[1].startTime).toBe('18:30')
    expect(result.lessons[1].endTime).toBe('21:20')
    expect(result.lessons[1].teacher).toBe('проф. Куклина Е.А.')
    expect(result.lessons[2].date).toBe('2026-09-14')
    expect(result.lessons[2].weekday).toBe(1) // Пн.
    expect(result.lessons[2].location).toBe('СДО РАНХиГС')
  })

  it('infers the year across the New Year boundary for autumn semesters', () => {
    const html = page(
      row(['Чт.', '24', '12', '18.30-21.20', 'БИ-4-26-02', 'ПЗ', 'Управленческий анализ', '<em>проф.</em>', '<em>Куклина Е.А.</em>', '']) +
        row(['Пн.', '12', '01', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Менеджмент данных', '<em>доц.</em>', '<em>Аникин А.В.</em>', '']),
    )

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons[0].date).toBe('2026-12-24')
    expect(result.lessons[1].date).toBe('2027-01-12')
  })

  it('uses the upcoming year for spring-only semesters in autumn/winter', () => {
    const html = page(row(['Пн.', '09', '02', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Менеджмент данных', '<em>доц.</em>', '<em>Аникин А.В.</em>', '']))

    expect(parseScheduleHtml(html, new Date(2026, 10, 1)).lessons[0].date).toBe('2027-02-09')
  })

  it('uses the current year for spring-only semesters in winter/spring', () => {
    const html = page(row(['Пн.', '09', '02', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Менеджмент данных', '<em>доц.</em>', '<em>Аникин А.В.</em>', '']))

    expect(parseScheduleHtml(html, new Date(2027, 2, 15)).lessons[0].date).toBe('2027-02-09')
  })

  it('skips rows without a time and collects rows with broken dates', () => {
    const html = page(
      row(['', '01', '09', '', 'БИ-4-26-02', 'П', 'Научно-исследовательская работа 01.09.2026-11.06.2027', '', '', 'ПРАКТИКА']) +
        row(['Пн.', '14', '09', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Деловой английский язык в IT-сфере', '<em>доц.</em>', '<em>Санжарова О.Н.</em>', 'СДО РАНХиГС']) +
        row(['', '', '', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Без даты', '', '', '']),
    )

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Деловой английский язык в IT-сфере')
    // Строка без времени не попадает и в invalid — её нельзя разместить в календаре
    // Строка с временем, но пустой датой попадает в invalid
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]).toMatchObject({
      title: 'Без даты',
      startTime: '18:30',
      endTime: '21:20',
      rawDay: '',
      rawMonth: '',
      reason: 'malformed',
    })
  })

  it('returns zero lessons for a page without a schedule table', () => {
    const result = parseScheduleHtml('<html><body><p>Ничего нет</p></body></html>', NOW)

    expect(result.groupName).toBe('')
    expect(result.lessons).toEqual([])
    expect(result.invalid).toEqual([])
  })

  it('normalizes single-digit hour times', () => {
    const html = page(row(['Сб.', '05', '12', '9.00-10.30', 'БИ-4-26-02', 'Л', 'Интеллектуальный анализ', '<em>доц.</em>', '<em>Зеленина Л.И.</em>', 'СДО РАНХиГС']))

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons[0].startTime).toBe('09:00')
    expect(result.lessons[0].endTime).toBe('10:30')
  })

  it('supports full dates in the date cell', () => {
    const html = page(row(['Пн.', '01.09.2026', '', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Лекция с полной датой', '', '', '']))

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons[0].date).toBe('2026-09-01')
    expect(result.lessons[0].weekday).toBe(2) // Вт.? Нет — 01.09.2026 это вторник
  })

  it('collects rows with full dates that do not exist in the calendar into invalid', () => {
    const html = page(
      row(['Пн.', '31.02.2026', '', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Пара 31 февраля', '', '', '']) +
        row(['Пн.', '02.03.2026', '', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Реальная пара', '', '', '']),
    )

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Реальная пара')
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]).toMatchObject({
      title: 'Пара 31 февраля',
      rawDay: '31.02.2026',
      reason: 'date_not_exists',
    })
  })

  it('treats an empty room cell as missing location', () => {
    const html = page(row(['Чт.', '01', '10', '18.30-21.20', 'БИ-4-26-02', 'ПЗ', 'Управленческий анализ', '<em>проф.</em>', '<em>Куклина Е.А.</em>', '']))

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons[0].location).toBeUndefined()
  })

  it('collects raw group values with lesson counts', () => {
    const html = page(
      row(['Пн.', '01', '09', '18.30-21.20', 'БИ-3-24-04', 'Л', 'Пара только для 04', '', '', '']) +
        row(['Пн.', '01', '09', '18.30-21.20', 'БИ-3-24-03', 'Л', 'Пара только для 03', '', '', '']) +
        row(['Пн.', '01', '09', '18.30-21.20', 'БИ-3-24-03-04', 'Л', 'Общая пара', '', '', '']) +
        row(['Пн.', '310', '10', '18.30-21.20', 'БИ-3-24-04', 'ПЗ', 'Битая пара 04', '', '', '']),
    )

    const result = parseScheduleHtml(html, NOW)

    expect(result.groups).toEqual([
      { rawGroup: 'БИ-3-24-04', count: 1, invalidCount: 1 },
      { rawGroup: 'БИ-3-24-03', count: 1, invalidCount: 0 },
      { rawGroup: 'БИ-3-24-03-04', count: 1, invalidCount: 0 },
    ])
    expect(result.lessons[0].rawGroup).toBe('БИ-3-24-04')
    expect(result.lessons[2].rawGroup).toBe('БИ-3-24-03-04')
    expect(result.invalid[0].rawGroup).toBe('БИ-3-24-04')
  })

  it('collects rows with malformed day cells into invalid', () => {
    // На сайте вуза встречается опечатка: в ячейке дня написано "310" вместо "31"
    const html = page(
      row(['Пн.', '310', '10', '18.30-21.20', 'БИ-3-24-03-04', 'ПЗ', 'Социология', '<em>доц.</em>', '<em>Киселев Н.Е.</em>', '']) +
        row(['Пн.', '12', '10', '18.30-21.20', 'БИ-3-24-03-04', 'Л', 'Менеджмент данных', '<em>доц.</em>', '<em>Аникин А.В.</em>', '']),
    )

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Менеджмент данных')
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]).toMatchObject({
      title: 'Социология',
      startTime: '18:30',
      endTime: '21:20',
      type: 'ПЗ',
      teacher: 'доц. Киселев Н.Е.',
      rawDay: '310',
      rawMonth: '10',
      reason: 'malformed',
    })
  })

  it('collects rows with dates that do not exist in the calendar into invalid', () => {
    const html = page(
      row(['Пн.', '29', '02', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Пара 29 февраля', '', '', '']) +
        row(['Пн.', '12', '02', '18.30-21.20', 'БИ-4-26-02', 'Л', 'Реальная пара', '', '', '']),
    )

    const result = parseScheduleHtml(html, NOW)

    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Реальная пара')
    expect(result.lessons[0].date).toBe('2027-02-12')
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]).toMatchObject({
      title: 'Пара 29 февраля',
      rawDay: '29',
      rawMonth: '02',
      reason: 'date_not_exists',
    })
  })
})
