import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import DifficultyPicker from '../components/games/DifficultyPicker'
import GameResultModal from '../components/games/GameResultModal'
import SnakeBoard from '../components/games/snake/SnakeBoard'
import { createSnakeGame, setSnakeDirection, snakeStep, snakeWin, type Direction } from '../lib/games/snake'
import { SNAKE_SIZE, SNAKE_SPEEDS, type GameDifficulty } from '../lib/games/types'

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

export default function SnakePage() {
  const submitGameRecord = useStore((s) => s.submitGameRecord)
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [game, setGame] = useState(() => createSnakeGame(SNAKE_SIZE))
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<{ score: number; seconds: number; isRecord: boolean } | null>(null)
  const resultHandledRef = useRef(false)

  const resetGame = (d: GameDifficulty) => {
    resultHandledRef.current = false
    setDifficulty(d)
    setGame(createSnakeGame(SNAKE_SIZE))
    setStarted(false)
    setPaused(false)
    setSeconds(0)
    setResult(null)
  }

  const steer = (dir: Direction) => {
    if (result) return
    setStarted(true)
    setPaused(false)
    setGame((g) => setSnakeDirection(g, dir))
  }

  // game loop
  useEffect(() => {
    if (!started || paused || result) return
    const id = setInterval(() => {
      setGame((g) => {
        const next = snakeStep(g)
        if (snakeWin(next)) return { ...next, gameOver: true }
        return next
      })
    }, SNAKE_SPEEDS[difficulty])
    return () => clearInterval(id)
  }, [started, paused, result, difficulty])

  // elapsed seconds
  useEffect(() => {
    if (!started || paused || result) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [started, paused, result])

  // end of game — submit record once (guard: effect re-runs when result clears)
  useEffect(() => {
    if (!game.gameOver || resultHandledRef.current) return
    resultHandledRef.current = true
    const isRecord = submitGameRecord('snake', difficulty, game.score)
    setResult({ score: game.score, seconds, isRecord })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.gameOver, result])

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIRECTIONS[e.key]
      if (dir) {
        e.preventDefault()
        steer(dir)
      } else if (e.key === ' ' && started) {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, paused, result])

  const won = result !== null && game.snake.length === game.size * game.size

  return (
    <div>
      <PageHeader
        title="Змейка"
        subtitle="Собирай еду и не врезайся"
        action={
          <Link to="/games" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            ← Все игры
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <DifficultyPicker value={difficulty} onChange={resetGame} disabled={started && !result} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Счёт: {game.score} · Время: {seconds} с
        </p>
        <Button variant="secondary" size="sm" onClick={() => resetGame(difficulty)}>
          Заново
        </Button>
      </div>
      {!started && <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Нажми стрелку или проведи пальцем, чтобы начать.</p>}
      {paused && !result && <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">Пауза — нажми пробел, чтобы продолжить.</p>}
      <SnakeBoard game={game} onSwipe={steer} />
      <GameResultModal
        open={result !== null}
        title={won ? 'Победа! 🎉' : 'Игра окончена 💀'}
        message={result ? `Счёт: ${result.score} · Время: ${result.seconds} с` : ''}
        isRecord={result?.isRecord ?? false}
        onClose={() => setResult(null)}
        onRestart={() => resetGame(difficulty)}
      />
    </div>
  )
}
