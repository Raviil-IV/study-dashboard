import type { MemoryCard as MemoryCardType } from '../../../lib/games/memory'

export default function MemoryCard({ card, index, visible, onClick }: { card: MemoryCardType; index: number; visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid={`memory-card-${index}`}
      data-state={visible ? 'open' : 'closed'}
      onClick={onClick}
      aria-label={`Карточка ${index + 1}`}
      className={`flex aspect-square items-center justify-center rounded-lg text-2xl transition-colors ${
        visible
          ? 'bg-indigo-50 dark:bg-indigo-900/40'
          : 'bg-gray-200 text-gray-400 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
      }`}
    >
      {visible ? card.emoji : '?'}
    </button>
  )
}
