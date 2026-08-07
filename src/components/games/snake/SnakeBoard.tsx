import { useRef } from 'react'
import type { Direction, SnakeGameState } from '../../../lib/games/snake'

export default function SnakeBoard({ game, onSwipe }: { game: SnakeGameState; onSwipe: (dir: Direction) => void }) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const occupied = new Set(game.snake.map((p) => `${p.x},${p.y}`))
  const head = game.snake[0]
  const cells = []
  for (let y = 0; y < game.size; y++) {
    for (let x = 0; x < game.size; x++) {
      const isHead = head.x === x && head.y === y
      const isBody = occupied.has(`${x},${y}`)
      const isFood = game.food !== null && game.food.x === x && game.food.y === y
      const role = isHead ? 'head' : isBody ? 'body' : isFood ? 'food' : undefined
      const cls = isHead
        ? 'bg-indigo-600'
        : isBody
          ? 'bg-indigo-400'
          : isFood
            ? 'rounded-full bg-red-500'
            : 'bg-gray-100 dark:bg-gray-800'
      cells.push(
        <div
          key={`${x},${y}`}
          data-testid={`snake-cell-${x}-${y}`}
          data-role={role}
          className={`aspect-square ${cls}`}
        />,
      )
    }
  }
  return (
    <div
      className="grid max-w-md gap-px rounded-lg bg-gray-200 p-1 dark:bg-gray-700"
      style={{ gridTemplateColumns: `repeat(${game.size}, minmax(0, 1fr))` }}
      onTouchStart={(e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current
        touchStart.current = null
        if (!start) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
        onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
      }}
    >
      {cells}
    </div>
  )
}
