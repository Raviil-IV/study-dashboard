import type { ReactNode } from 'react'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function GameResultModal({
  open,
  title,
  message,
  isRecord,
  onClose,
  onRestart,
}: {
  open: boolean
  title: ReactNode
  message: string
  isRecord: boolean
  onClose: () => void
  onRestart: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      {isRecord && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Icon name="trophy" size={14} />
          Новый рекорд!
        </p>
      )}
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
        <Button onClick={onRestart}>Заново</Button>
      </div>
    </Modal>
  )
}
