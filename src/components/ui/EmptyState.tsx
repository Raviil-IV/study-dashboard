export default function EmptyState({ icon, title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-8 text-center ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      {icon && <span className="mb-1 text-3xl">{icon}</span>}
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {hint && <p className="text-sm text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  )
}
