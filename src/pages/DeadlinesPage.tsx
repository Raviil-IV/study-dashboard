import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Deadline } from '../types'
import { daysUntil } from '../lib/date'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import DeadlineForm, { type DeadlineFormValues } from '../components/deadlines/DeadlineForm'
import DeadlineItem from '../components/deadlines/DeadlineItem'

export default function DeadlinesPage() {
  const deadlines = useStore((s) => s.deadlines)
  const addDeadline = useStore((s) => s.addDeadline)
  const updateDeadline = useStore((s) => s.updateDeadline)
  const removeDeadline = useStore((s) => s.removeDeadline)
  const [tab, setTab] = useState('upcoming')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Deadline | undefined>()

  const sorted = useMemo(() => [...deadlines].sort((a, b) => a.date.localeCompare(b.date)), [deadlines])
  const upcoming = sorted.filter((d) => daysUntil(d.date) >= 0)
  const past = sorted.filter((d) => daysUntil(d.date) < 0)
  const visible = tab === 'upcoming' ? upcoming : past

  const handleSubmit = (values: DeadlineFormValues) => {
    if (editing) {
      updateDeadline(editing.id, values)
    } else {
      addDeadline(values)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить дедлайн?')) {
      removeDeadline(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Дедлайны"
        subtitle="Экзамены, контрольные и важные даты"
        action={<Button onClick={() => { setEditing(undefined); setModalOpen(true) }}>Добавить дедлайн</Button>}
      />
      <Tabs
        tabs={[
          { value: 'upcoming', label: 'Будущие' },
          { value: 'past', label: 'Прошедшие' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <ul className="mt-4 space-y-2">
        {visible.map((d) => (
          <DeadlineItem
            key={d.id}
            deadline={d}
            onEdit={() => { setEditing(d); setModalOpen(true) }}
            onDelete={() => handleDelete(d.id)}
          />
        ))}
      </ul>
      {visible.length === 0 && (
        <div className="mt-4">
          <EmptyState icon="⏰" title={tab === 'upcoming' ? 'Нет ближайших дедлайнов' : 'Прошедших дедлайнов нет'} hint="Добавь важную дату, чтобы не забыть о ней" />
        </div>
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать дедлайн' : 'Новый дедлайн'} onClose={() => setModalOpen(false)}>
        <DeadlineForm key={editing?.id ?? 'new'} initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
