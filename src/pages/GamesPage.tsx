import { useStore } from '../store/useStore'
import PageHeader from '../components/ui/PageHeader'
import GameCard from '../components/games/GameCard'
import type { GameId } from '../lib/games/types'
import type { IconName } from '../components/ui/Icon'

const GAMES: { id: GameId; title: string; icon: IconName; description: string }[] = [
  { id: 'memory', title: 'Мемори', icon: 'brain', description: 'Найди все пары карточек за минимальное число ходов.' },
  { id: 'snake', title: 'Змейка', icon: 'waypoints', description: 'Собирай еду и не врезайся в стены и собственный хвост.' },
  { id: 'minesweeper', title: 'Сапёр', icon: 'bomb', description: 'Открой все клетки без мин, помечай мины флажками.' },
]

export default function GamesPage() {
  const gameRecords = useStore((s) => s.gameRecords)
  return (
    <div>
      <PageHeader title="Игры" subtitle="Небольшие игры для перерыва между занятиями" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} records={gameRecords[g.id] ?? {}} />
        ))}
      </div>
    </div>
  )
}
