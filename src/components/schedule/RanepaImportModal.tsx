import { useState } from 'react'
import { api } from '../../lib/api'
import { notifyError } from '../../lib/toast'
import { pluralRu } from '../../lib/date'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import RanepaFixDatesModal from './RanepaFixDatesModal'
import RanepaGroupSelectModal from './RanepaGroupSelectModal'
import type { Lesson, RanepaImportStatus, RanepaPreview } from '../../types'

function shortDate(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export default function RanepaImportModal({
  existing,
  onClose,
  onImported,
}: {
  existing: RanepaImportStatus | null
  onClose: () => void
  onImported: (url: string, lessons: Lesson[]) => void
}) {
  const [url, setUrl] = useState(existing?.url ?? '')
  const [preview, setPreview] = useState<RanepaPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixDates, setFixDates] = useState<(string | undefined)[]>([])
  const [fixOpen, setFixOpen] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupOpen, setGroupOpen] = useState(false)

  const trimmedUrl = url.trim()
  const groups = preview?.groups ?? []
  const multiGroup = groups.length > 1
  const invalid = preview?.invalid ?? []
  // Существующий импорт с другой ссылкой будет полностью заменён
  const replacesExisting = Boolean(existing && existing.url !== trimmedUrl)
  // Окно исправления дат показывает только invalid-строки выбранных групп
  const visibleInvalid = multiGroup ? invalid.filter((l) => l.rawGroup && selectedGroups.includes(l.rawGroup)) : invalid
  const fixedCount = fixDates.filter((d) => d).length
  const importDisabled = loading || (multiGroup && selectedGroups.length === 0)

  const handleLoad = async () => {
    setLoading(true)
    try {
      const p = await api.post<RanepaPreview>('/ranepa/preview', { url: trimmedUrl })
      setPreview(p)
      setFixDates(Array.from({ length: p.invalid?.length ?? 0 }, () => undefined))
      // Для обновления существующего импорта: сохранённый выбор или всё (старые импорты хранили «все»)
      if (existing) {
        const stored = existing.groups ?? []
        setSelectedGroups(stored.length > 0 ? stored : (p.groups ?? []).map((g) => g.rawGroup))
      } else {
        setSelectedGroups([])
      }
    } catch (err) {
      notifyError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const fixes = fixDates
        .map((date, i) => {
          if (!date) return null
          const item = visibleInvalid[i]
          const index = item ? invalid.indexOf(item) : -1
          return index >= 0 ? { index, date } : null
        })
        .filter((f): f is { index: number; date: string } => f !== null)
      const res = await api.post<{ groupName: string; count: number; lessons: Lesson[] }>('/ranepa/import', {
        url: trimmedUrl,
        ...(multiGroup && { groups: selectedGroups }),
        ...(fixes.length > 0 && { fixes }),
      })
      onImported(trimmedUrl, res.lessons)
    } catch (err) {
      notifyError(err)
      setLoading(false)
    }
  }

  return (
    <Modal open title="Импорт из РАНХиГС" onClose={onClose}>
      <div className="space-y-4">
        {!preview && (
          <>
            <div>
              <label htmlFor="ranepa-url" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ссылка на расписание
              </label>
              <input
                id="ranepa-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://spb.ranepa.ru/raspisanie/…"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Страница расписания с сайта spb.ranepa.ru, например https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={handleLoad} disabled={!trimmedUrl || loading}>
                {loading ? 'Загружаем…' : 'Загрузить'}
              </Button>
            </div>
          </>
        )}

        {preview && (
          <>
            <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{preview.groupName || 'Группа не указана'}</p>
              {preview.count > 0 ? (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {preview.count} {pluralRu(preview.count, 'занятие', 'занятия', 'занятий')}
                  {preview.firstDate && preview.lastDate ? ` · ${shortDate(preview.firstDate)} — ${shortDate(preview.lastDate)}` : ''}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Занятий на этой странице не найдено</p>
              )}
              {replacesExisting && (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                  Текущее импортированное расписание будет заменено
                </p>
              )}
              {multiGroup && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Группы: {groups.length} {pluralRu(groups.length, 'вариант', 'варианта', 'вариантов')} · выбрано:{' '}
                  {selectedGroups.length}
                </p>
              )}
              {invalid.length > 0 && (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                  {invalid.length} {pluralRu(invalid.length, 'занятие', 'занятия', 'занятий')} с некорректной датой
                  {fixedCount > 0 ? ` · исправлено: ${fixedCount}` : ''}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Назад
              </Button>
              {multiGroup && (
                <Button variant="secondary" onClick={() => setGroupOpen(true)}>
                  Выбрать группы
                </Button>
              )}
              {visibleInvalid.length > 0 && (
                <Button variant="secondary" onClick={() => setFixOpen(true)}>
                  Исправить даты
                </Button>
              )}
              {preview.count > 0 && (
                <Button onClick={handleImport} disabled={importDisabled}>
                  {loading ? 'Сохраняем…' : existing ? 'Обновить' : 'Импортировать'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      {fixOpen && (
        <RanepaFixDatesModal
          items={visibleInvalid}
          initialDates={visibleInvalid.map((item) => fixDates[invalid.indexOf(item)] ?? undefined)}
          onSave={(dates) => {
            const next = [...fixDates]
            visibleInvalid.forEach((item, i) => {
              next[invalid.indexOf(item)] = dates[i]
            })
            setFixDates(next)
            setFixOpen(false)
          }}
          onCancel={() => setFixOpen(false)}
        />
      )}
      {groupOpen && (
        <RanepaGroupSelectModal
          groups={groups}
          initialSelection={selectedGroups}
          onSave={(selected) => {
            setSelectedGroups(selected)
            setFixDates(fixDates.map(() => undefined))
            setGroupOpen(false)
          }}
          onCancel={() => setGroupOpen(false)}
        />
      )}
    </Modal>
  )
}
