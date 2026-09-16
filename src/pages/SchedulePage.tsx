import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Lesson, RanepaImportStatus } from '../types'
import { nextLesson, pluralRu } from '../lib/date'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import DayView from '../components/schedule/DayView'
import WeekView from '../components/schedule/WeekView'
import MonthView from '../components/schedule/MonthView'
import LessonForm, { type LessonFormValues } from '../components/schedule/LessonForm'
import RanepaImportModal from '../components/schedule/RanepaImportModal'

const DAY_MS = 24 * 60 * 60 * 1000

export default function SchedulePage() {
  const lessons = useStore((s) => s.lessons)
  const addLesson = useStore((s) => s.addLesson)
  const updateLesson = useStore((s) => s.updateLesson)
  const removeLesson = useStore((s) => s.removeLesson)
  const applyRanepaImport = useStore((s) => s.applyRanepaImport)
  const removeRanepaImports = useStore((s) => s.removeRanepaImports)
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lesson | undefined>()
  const [importOpen, setImportOpen] = useState(false)
  const [ranepaImports, setRanepaImports] = useState<RanepaImportStatus[]>([])

  const next = nextLesson(lessons)

  const loadRanepaStatus = useCallback(async (): Promise<RanepaImportStatus[]> => {
    try {
      const res = await api.get<{ imports: RanepaImportStatus[] }>('/ranepa/status')
      if (!res) return []
      setRanepaImports(res.imports ?? [])
      return res.imports ?? []
    } catch {
      return []
    }
  }, [])

  // Автообновление: при открытии страницы тихо перечитываем источники,
  // с которыми не синхронизировались больше 24 часов
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const imports = await loadRanepaStatus()
      if (cancelled) return
      const stale = imports.filter((imp) => Date.now() - new Date(imp.syncedAt).getTime() > DAY_MS)
      for (const imp of stale) {
        try {
          const result = await api.post<{ groupName: string; count: number; lessons: Lesson[] }>('/ranepa/import', {
            url: imp.url,
            ...(imp.groups?.length > 0 && { groups: imp.groups }),
          })
          if (cancelled) return
          if (result) {
            applyRanepaImport(imp.url, result.lessons)
            if (result.count > 0) {
              useToast.getState().show(`Расписание обновлено: ${result.count} ${pluralRu(result.count, 'занятие', 'занятия', 'занятий')}`)
            }
          }
        } catch {
          // автообновление не должно шуметь тостами об ошибках
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadRanepaStatus, applyRanepaImport])

  const openAdd = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (lesson: Lesson) => {
    setEditing(lesson)
    setModalOpen(true)
  }
  const handleSubmit = (values: LessonFormValues) => {
    const lesson = { ...values, date: values.date || undefined }
    if (editing) {
      updateLesson(editing.id, lesson)
    } else {
      addLesson(lesson)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить занятие?')) {
      removeLesson(id)
      setModalOpen(false)
    }
  }
  const handleImported = (url: string, imported: Lesson[]) => {
    applyRanepaImport(url, imported)
    setImportOpen(false)
    useToast.getState().show(`Импортировано занятий: ${imported.length}`)
    void loadRanepaStatus()
  }

  const handleDeleteImport = () => {
    if (window.confirm('Удалить импортированное расписание? Ручные занятия останутся.')) {
      removeRanepaImports()
      setRanepaImports([])
      useToast.getState().show('Импортированное расписание удалено')
    }
  }

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle={next ? `Следующее занятие: ${next.title} · ${next.startTime}` : 'Занятий пока нет'}
        action={
          <>
            {ranepaImports.length > 0 && (
              <Button variant="danger" onClick={handleDeleteImport}>
                Удалить импорт
              </Button>
            )}
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              {ranepaImports.length > 0 ? 'Обновить из РАНХиГС' : 'Импорт из РАНХиГС'}
            </Button>
            <Button onClick={openAdd}>Добавить занятие</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Неделя' },
            { value: 'month', label: 'Месяц' },
          ]}
          value={view}
          onChange={(v) => setView(v as 'day' | 'week' | 'month')}
        />
      </div>
      {view === 'day' ? (
        <DayView lessons={lessons} date={new Date()} onEdit={openEdit} />
      ) : view === 'week' ? (
        <WeekView lessons={lessons} onEdit={openEdit} />
      ) : (
        <MonthView lessons={lessons} onEdit={openEdit} />
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать занятие' : 'Новое занятие'} onClose={() => setModalOpen(false)}>
        <LessonForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
        />
      </Modal>
      {importOpen && (
        <RanepaImportModal
          existing={ranepaImports[0] ?? null}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  )
}
