import Select from '../ui/Select'
import { TASK_PRIORITIES, TASK_STATUSES } from '../../lib/constants'

export interface Filters {
  status: string
  priority: string
  subject: string
  todayOnly: boolean
  overdueOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  status: 'all',
  priority: 'all',
  subject: 'all',
  todayOnly: false,
  overdueOnly: false,
}

const STATUS_OPTIONS = [{ value: 'all', label: 'Все' }, ...TASK_STATUSES]
const PRIORITY_OPTIONS = [{ value: 'all', label: 'Любой' }, ...TASK_PRIORITIES]

function ChipGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${value === o.value ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function TaskFilters({ filters, onChange, subjects }: { filters: Filters; onChange: (f: Filters) => void; subjects: string[] }) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Статус</span>
        <ChipGroup options={STATUS_OPTIONS} value={filters.status} onChange={(status) => set({ status })} />
      </div>
      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Приоритет</span>
        <ChipGroup options={PRIORITY_OPTIONS} value={filters.priority} onChange={(priority) => set({ priority })} />
      </div>
      <Select label="Предмет" value={filters.subject} onChange={(e) => set({ subject: e.target.value })}>
        <option value="all">Любой</option>
        {subjects.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={filters.todayOnly} onChange={(e) => set({ todayOnly: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
        На сегодня
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={filters.overdueOnly} onChange={(e) => set({ overdueOnly: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
        Просроченные
      </label>
    </div>
  )
}
