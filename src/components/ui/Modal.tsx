import type { ReactNode } from 'react'
import IconButton from './IconButton'

type ModalSize = 'lg' | '3xl' | '4xl'

const sizeClasses: Record<ModalSize, string> = {
  lg: 'max-w-lg',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
}

export default function Modal({
  open,
  title,
  onClose,
  size = 'lg',
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  size?: ModalSize
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div data-testid="modal-overlay" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <IconButton name="close" label="Закрыть" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}
