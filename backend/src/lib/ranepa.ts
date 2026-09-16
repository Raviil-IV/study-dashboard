import * as cheerio from 'cheerio'

export interface ParsedLesson {
  /** ISO YYYY-MM-DD */
  date: string
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number
  /** HH:MM */
  startTime: string
  /** HH:MM */
  endTime: string
  title: string
  /** Л / ПЗ / К / П */
  type?: string
  /** Должность + ФИО, например "доц. Гурьева Т.Н." */
  teacher?: string
  location?: string
  /** Сырое значение ячейки «Группы» с сайта, например "БИ-3-24-03-04" */
  rawGroup: string
}

export interface InvalidLesson {
  title: string
  startTime: string
  endTime: string
  type?: string
  teacher?: string
  location?: string
  /** Сырое значение ячейки дня с сайта (например, "310" или "31.02.2026") */
  rawDay: string
  /** Сырое значение ячейки месяца с сайта; пусто для полных дат */
  rawMonth: string
  reason: 'malformed' | 'date_not_exists'
  /** Сырое значение ячейки «Группы» с сайта */
  rawGroup: string
}

export interface ParsedGroup {
  rawGroup: string
  count: number
  invalidCount: number
}

export interface ParsedSchedule {
  groupName: string
  lessons: ParsedLesson[]
  /** Строки с временем и названием, но некорректной датой — их можно исправить вручную */
  invalid: InvalidLesson[]
  /** Уникальные значения ячейки «Группы» с количеством занятий */
  groups: ParsedGroup[]
}

const TIME_RE = /(\d{1,2})\.(\d{2})\s*-\s*(\d{1,2})\.(\d{2})/
const FULL_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/

const pad = (n: number): string => String(n).padStart(2, '0')
const padDate = (d: number): string => String(d).padStart(2, '0')

function toISODate(day: number, month: number, year: number): string {
  return `${year}-${padDate(month)}-${padDate(day)}`
}

/**
 * В таблице расписания нет года — только число и месяц. Восстанавливаем год:
 * если в расписании есть месяцы 08–12 (осенний семестр), они относятся к
 * «якорному» году, а месяцы 01–07 — к следующему; якорный год = текущий год,
 * если сейчас август–декабрь, иначе прошлый. Если в расписании только
 * весенние месяцы — это весенний семестр текущего учебного года (следующего,
 * если сейчас август–декабрь).
 */
function inferYear(day: number, month: number, months: number[], now: Date): number {
  const hasAutumn = months.some((m) => m >= 8)
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  if (hasAutumn) {
    const anchor = nowMonth >= 8 ? nowYear : nowYear - 1
    return month >= 8 ? anchor : anchor + 1
  }
  return nowMonth >= 8 ? nowYear + 1 : nowYear
}

/** Проверяет, что дата реально существует в календаре */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const dt = new Date(year, month - 1, day)
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day
}

export function parseScheduleHtml(html: string, now: Date = new Date()): ParsedSchedule {
  const $ = cheerio.load(html)
  const groupName = ($('title').first().text() || '').trim()

  // Находим таблицу с наибольшим числом строк, похожих на расписание
  let best: ReturnType<cheerio.CheerioAPI> | undefined
  let bestCount = 0
  $('table').each((_, table) => {
    let count = 0
    $(table)
      .find('tbody tr')
      .each((__, tr) => {
        const cells = $(tr).find('td')
        if (cells.length < 4) return
        const day = cells.eq(1).text().trim()
        const month = cells.eq(2).text().trim()
        if (/^\d{1,2}$/.test(day) && /^\d{1,2}$/.test(month)) count++
        else if (FULL_DATE_RE.test(day)) count++
      })
    if (count > bestCount) {
      bestCount = count
      best = $(table)
    }
  })

  const lessons: ParsedLesson[] = []
  const invalid: InvalidLesson[] = []
  const groupsMap = new Map<string, ParsedGroup>()
  if (!best) return { groupName, lessons, invalid, groups: [] }

  const bumpGroup = (rawGroup: string, kind: 'lesson' | 'invalid') => {
    const entry = groupsMap.get(rawGroup) ?? { rawGroup, count: 0, invalidCount: 0 }
    if (kind === 'lesson') entry.count++
    else entry.invalidCount++
    groupsMap.set(rawGroup, entry)
  }

  const monthsInTable: number[] = []
  best.find('tbody tr').each((_, tr) => {
    const month = $(tr).find('td').eq(2).text().trim()
    if (/^\d{1,2}$/.test(month)) monthsInTable.push(Number(month))
  })

  let detectedGroup = ''
  best.find('tbody tr').each((_, tr) => {
    const cells = $(tr).find('td')
    if (cells.length < 4) return
    const dayCell = cells.eq(1).text().trim()
    const monthCell = cells.eq(2).text().trim()
    const timeCell = cells.eq(3).text().trim()
    const title = cells.eq(6).text().trim().replace(/\s+/g, ' ')
    if (!title) return

    const timeMatch = TIME_RE.exec(timeCell)
    if (!timeMatch) return

    const group = cells.eq(4).text().trim()
    if (group && !detectedGroup) detectedGroup = group
    const rawGroup = group

    const [, sh, sm, eh, em] = timeMatch.map(Number)
    const startTime = `${pad(sh)}:${pad(sm)}`
    const endTime = `${pad(eh)}:${pad(em)}`

    const type = cells.eq(5).text().trim() || undefined
    const position = cells.eq(7).text().trim()
    const teacherName = cells.eq(8).text().trim()
    const teacher = [position, teacherName].filter(Boolean).join(' ').trim() || undefined
    const location = cells.eq(9).text().trim() || undefined

    const pushInvalid = (rawDay: string, rawMonth: string, reason: InvalidLesson['reason']) => {
      invalid.push({ title, startTime, endTime, type, teacher, location, rawDay, rawMonth, reason, rawGroup })
      bumpGroup(rawGroup, 'invalid')
    }

    const fullDate = FULL_DATE_RE.exec(dayCell)
    if (fullDate) {
      const [, d, m, y] = fullDate.map(Number)
      if (!isValidCalendarDate(y, m, d)) {
        pushInvalid(dayCell, '', 'date_not_exists')
        return
      }
      const dt = new Date(y, m - 1, d)
      lessons.push({
        date: toISODate(d, m, y),
        weekday: dt.getDay(),
        startTime,
        endTime,
        title,
        type,
        teacher,
        location,
        rawGroup,
      })
      bumpGroup(rawGroup, 'lesson')
      return
    }

    // День и месяц должны быть 1–2-значными числами; на сайте вуза встречаются опечатки (например, "310")
    if (!/^\d{1,2}$/.test(dayCell) || !/^\d{1,2}$/.test(monthCell)) {
      pushInvalid(dayCell, monthCell, 'malformed')
      return
    }
    const day = Number(dayCell)
    const month = Number(monthCell)
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      pushInvalid(dayCell, monthCell, 'malformed')
      return
    }
    const year = inferYear(day, month, monthsInTable, now)
    // Отбрасываем несуществующие даты (31.02, 29.02 в невисокосный год и т.п.)
    if (!isValidCalendarDate(year, month, day)) {
      pushInvalid(dayCell, monthCell, 'date_not_exists')
      return
    }
    const dt = new Date(year, month - 1, day)
    lessons.push({
      date: toISODate(day, month, year),
      weekday: dt.getDay(),
      startTime,
      endTime,
      title,
      type,
      teacher,
      location,
      rawGroup,
    })
    bumpGroup(rawGroup, 'lesson')
  })

  return { groupName: detectedGroup || groupName, lessons, invalid, groups: [...groupsMap.values()] }
}
