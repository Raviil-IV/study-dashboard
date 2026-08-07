import type { ReactNode } from 'react'
import type { MinesweeperGameState } from '../../../lib/games/minesweeper'

export default function MinesweeperField({
  game,
  onOpen,
  onFlag,
}: {
  game: MinesweeperGameState
  onOpen: (index: number) => void
  onFlag: (index: number) => void
}) {
  return (
    <div
      className="grid gap-px rounded-lg bg-gray-200 p-1 dark:bg-gray-700"
      style={{ gridTemplateColumns: `repeat(${game.cols}, minmax(0, 1fr))` }}
    >
      {game.cells.map((cell, i) => {
        const state = cell.revealed ? 'revealed' : cell.flagged ? 'flagged' : 'hidden'
        let content: ReactNode = ''
        if (cell.revealed) content = cell.mine ? '💣' : cell.adjacent > 0 ? cell.adjacent : ''
        else if (cell.flagged) content = '🚩'
        const revealedCls = cell.revealed
          ? cell.mine
            ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300'
            : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          : 'bg-white text-gray-500 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-700'
        return (
          <button
            key={i}
            type="button"
            data-testid={`mine-cell-${i}`}
            data-state={state}
            onClick={() => onOpen(i)}
            onContextMenu={(e) => {
              e.preventDefault()
              onFlag(i)
            }}
            className={`flex aspect-square items-center justify-center text-xs font-semibold sm:text-sm ${revealedCls}`}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
