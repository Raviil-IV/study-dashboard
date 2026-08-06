import type { ReactNode } from 'react'
import { COLOR_CLASSES } from '../../lib/constants'

export default function Badge({ color, children }: { color?: string; children: ReactNode }) {
  const cls = color && COLOR_CLASSES[color] ? COLOR_CLASSES[color].badge : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}
