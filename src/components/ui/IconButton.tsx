type IconName = 'edit' | 'trash' | 'pin' | 'close' | 'plus' | 'chevron-left' | 'chevron-right' | 'home' | 'calendar' | 'check' | 'alert' | 'note' | 'timer' | 'settings' | 'sun' | 'moon' | 'system'

const icons: Record<IconName, string> = {
  edit: '✏️',
  trash: '🗑️',
  pin: '📌',
  close: '✕',
  plus: '＋',
  'chevron-left': '‹',
  'chevron-right': '›',
  home: '🏠',
  calendar: '📅',
  check: '✅',
  alert: '⏰',
  note: '📝',
  timer: '⏱️',
  settings: '⚙️',
  sun: '☀️',
  moon: '🌙',
  system: '💻',
}

export default function IconButton({ name, label, onClick }: { name: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      <span className="text-base leading-none">{icons[name]}</span>
    </button>
  )
}
