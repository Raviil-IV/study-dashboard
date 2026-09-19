import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../ui/Icon'
import { DIFFICULTY_LABELS, type GameDifficulty, type GameId } from '../../lib/games/types'

const RECORD_UNITS: Record<GameId, string> = {
  memory: 'ходов',
  snake: 'очков',
  minesweeper: 'сек',
}

const GAME_ICON_COLORS: Record<GameId, string> = {
  memory: 'text-indigo-500 dark:text-indigo-400',
  snake: 'text-emerald-500 dark:text-emerald-400',
  minesweeper: 'text-rose-500 dark:text-rose-400',
}

interface GameInfo {
  id: GameId
  title: string
  icon: IconName
  description: string
}

export default function GameCard({ game, records }: { game: GameInfo; records: Partial<Record<GameDifficulty, number>> }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-gray-900 dark:ring-gray-800"
    >
      <Icon name={game.icon} size={30} className={`mb-2 ${GAME_ICON_COLORS[game.id]}`} />
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{game.title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{game.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(['easy', 'medium', 'hard'] as const).map((d) => {
          const record = records[d]
          return (
            <span
              key={d}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {DIFFICULTY_LABELS[d]}: {record === undefined ? '—' : `${record} ${RECORD_UNITS[game.id]}`}
            </span>
          )
        })}
      </div>
    </Link>
  )
}
