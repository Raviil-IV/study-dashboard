import type { Deadline, Lesson, Note, Task } from '../types'

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function getDemoData(): { lessons: Lesson[]; tasks: Task[]; deadlines: Deadline[]; notes: Note[] } {
  return {
    lessons: [
      { id: crypto.randomUUID(), title: 'Математика', weekday: 1, startTime: '08:30', endTime: '10:00', location: 'Каб. 201', color: 'blue' },
      { id: crypto.randomUUID(), title: 'Физика', weekday: 1, startTime: '10:15', endTime: '11:45', location: 'Каб. 305', color: 'purple' },
      { id: crypto.randomUUID(), title: 'Английский', weekday: 2, startTime: '09:00', endTime: '10:30', location: 'Каб. 112', color: 'pink' },
      { id: crypto.randomUUID(), title: 'История', weekday: 3, startTime: '12:00', endTime: '13:30', location: 'Каб. 45', color: 'orange' },
      { id: crypto.randomUUID(), title: 'Информатика', weekday: 4, startTime: '14:00', endTime: '15:30', location: 'Каб. 218', color: 'teal' },
      { id: crypto.randomUUID(), title: 'Химия', weekday: 5, startTime: '08:30', endTime: '10:00', location: 'Каб. 402', color: 'green' },
    ],
    tasks: [
      { id: crypto.randomUUID(), title: 'Решить 10 задач по алгебре', subject: 'Математика', priority: 'high', status: 'todo', dueDate: isoDaysFromNow(1), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Прочитать главу 4 по истории', subject: 'История', priority: 'medium', status: 'in-progress', dueDate: isoDaysFromNow(2), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Подготовиться к диктанту', subject: 'Английский', priority: 'medium', status: 'todo', dueDate: isoDaysFromNow(3), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Сделать лабораторную по физике', subject: 'Физика', priority: 'high', status: 'todo', dueDate: isoDaysFromNow(5), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Повторить формулы по химии', subject: 'Химия', priority: 'low', status: 'done', createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    ],
    deadlines: [
      { id: crypto.randomUUID(), title: 'Контрольная по алгебре', type: 'test', subject: 'Математика', date: isoDaysFromNow(2), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Экзамен по физике', type: 'exam', subject: 'Физика', date: isoDaysFromNow(10), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Проект по информатике', type: 'project', subject: 'Информатика', date: isoDaysFromNow(14), createdAt: new Date().toISOString() },
    ],
    notes: [
      { id: crypto.randomUUID(), title: 'Формулы по тригонометрии', subject: 'Математика', content: 'sin²α + cos²α = 1\nФормулы приведения…', tags: ['математика', 'формулы'], pinned: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'План сочинения', subject: 'Русский язык', content: '1. Вступление\n2. Тезис\n3. Аргументы…', tags: ['русский'], pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
  }
}
