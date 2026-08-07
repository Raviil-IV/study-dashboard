import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { Lesson } from '../types'
import { nextLesson } from '../lib/date'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import DayView from '../components/schedule/DayView'
import WeekView from '../components/schedule/WeekView'
import LessonForm, { type LessonFormValues } from '../components/schedule/LessonForm'

export default function SchedulePage() {
  const lessons = useStore((s) => s.lessons)
  const addLesson = useStore((s) => s.addLesson)
  const updateLesson = useStore((s) => s.updateLesson)
  const removeLesson = useStore((s) => s.removeLesson)
  const [view, setView] = useState<'day' | 'week'>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lesson | undefined>()

  const next = nextLesson(lessons)

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
    }
  }

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle={next ? `Следующее занятие: ${next.title} · ${next.startTime}` : 'Занятий пока нет'}
        action={
          <Button onClick={openAdd}>Добавить занятие</Button>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Неделя' },
          ]}
          value={view}
          onChange={(v) => setView(v as 'day' | 'week')}
        />
      </div>
      {view === 'day' ? (
        <DayView lessons={lessons} date={new Date()} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <WeekView lessons={lessons} onEdit={openEdit} onDelete={handleDelete} />
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать занятие' : 'Новое занятие'} onClose={() => setModalOpen(false)}>
        <LessonForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
