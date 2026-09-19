import Icon, { type IconName } from './Icon'

export default function EmptyState({ icon, title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-8 text-center ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      {icon && <Icon name={icon} size={30} className="mb-1 text-indigo-500 dark:text-indigo-400" />}
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {hint && <p className="text-sm text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  )
}