import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Task } from '../types'
import { daysUntil, isToday } from '../lib/date'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import TaskForm, { type TaskFormValues } from '../components/tasks/TaskForm'
import TaskItem from '../components/tasks/TaskItem'
import TaskFilters, { DEFAULT_FILTERS, type Filters } from '../components/tasks/TaskFilters'

export default function TasksPage() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const removeTask = useStore((s) => s.removeTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>()

  const subjects = useMemo(() => Array.from(new Set(tasks.map((t) => t.subject).filter(Boolean))).sort() as string[], [tasks])

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (filters.status !== 'all' && t.status !== filters.status) return false
        if (filters.priority !== 'all' && t.priority !== filters.priority) return false
        if (filters.subject !== 'all' && t.subject !== filters.subject) return false
        if (filters.todayOnly && !(t.dueDate && isToday(t.dueDate))) return false
        if (filters.overdueOnly && !(t.dueDate && daysUntil(t.dueDate) < 0 && t.status !== 'done')) return false
        return true
      })
      .sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1
        if (a.status !== 'done' && b.status === 'done') return -1
        return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
      })
  }, [tasks, filters])

  const handleSubmit = (values: TaskFormValues) => {
    if (editing) {
      updateTask(editing.id, values)
    } else {
      addTask(values)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить задачу?')) {
      removeTask(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle="Домашние задания и учебные дела"
        action={<Button onClick={() => { setEditing(undefined); setModalOpen(true) }}>Добавить задачу</Button>}
      />
      <TaskFilters filters={filters} onChange={setFilters} subjects={subjects} />
      <ul className="mt-4 space-y-2">
        {filtered.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            onToggle={() => toggleTask(t.id)}
            onEdit={() => { setEditing(t); setModalOpen(true) }}
            onDelete={() => handleDelete(t.id)}
          />
        ))}
      </ul>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState icon="clipboard" title="Пока нет задач" hint="Добавь первую задачу, чтобы начать учиться" />
        </div>
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать задачу' : 'Новая задача'} onClose={() => setModalOpen(false)}>
        <TaskForm key={editing?.id ?? 'new'} initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
