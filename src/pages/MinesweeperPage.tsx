import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import DifficultyPicker from '../components/games/DifficultyPicker'
import GameResultModal from '../components/games/GameResultModal'
import MinesweeperField from '../components/games/minesweeper/MinesweeperField'
import { createMinesweeper, openCell, toggleFlag, type MinesweeperGameState } from '../lib/games/minesweeper'
import { MINESWEEPER_LEVELS, type GameDifficulty } from '../lib/games/types'

export default function MinesweeperPage() {
  const submitGameRecord = useStore((s) => s.submitGameRecord)
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [game, setGame] = useState<MinesweeperGameState>(() => createMinesweeper(9, 9, 10))
  const [mode, setMode] = useState<'open' | 'flag'>('open')
  const [started, setStarted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<{ seconds: number; isRecord: boolean; won: boolean } | null>(null)
  const resultHandledRef = useRef(false)

  const resetGame = (d: GameDifficulty) => {
    resultHandledRef.current = false
    const level = MINESWEEPER_LEVELS[d]
    setDifficulty(d)
    setGame(createMinesweeper(level.rows, level.cols, level.mines))
    setMode('open')
    setStarted(false)
    setSeconds(0)
    setResult(null)
  }

  // elapsed seconds
  useEffect(() => {
    if (!started || result) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [started, result])

  // end of game — submit record on win once (guard: effect re-runs when result clears)
  useEffect(() => {
    if (!game.gameOver || resultHandledRef.current) return
    resultHandledRef.current = true
    if (game.won) {
      void submitGameRecord('minesweeper', difficulty, seconds).then((isRecord) => {
        setResult({ seconds, isRecord, won: true })
      })
    } else {
      setResult({ seconds, isRecord: false, won: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.gameOver, result])

  const handleOpen = (index: number) => {
    if (result || game.gameOver) return
    setStarted(true)
    setGame((g) => openCell(g, index))
  }

  const handleFlag = (index: number) => {
    if (result || game.gameOver) return
    setGame((g) => toggleFlag(g, index))
  }

  return (
    <div>
      <PageHeader
        title="Сапёр"
        subtitle="Открой все клетки без мин"
        action={
          <Link to="/games" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            ← Все игры
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <DifficultyPicker value={difficulty} onChange={resetGame} disabled={started && !result} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Мины: {game.mines - game.flagsUsed} · Время: {seconds} с
        </p>
        <Button variant="secondary" size="sm" onClick={() => resetGame(difficulty)}>
          Заново
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={mode === 'flag'}
          onClick={() => setMode((m) => (m === 'open' ? 'flag' : 'open'))}
        >
          {mode === 'open' ? '🚩 Флаг' : '🔍 Открыть'}
        </Button>
      </div>
      <MinesweeperField
        game={game}
        onOpen={(i) => (mode === 'open' ? handleOpen(i) : handleFlag(i))}
        onFlag={handleFlag}
      />
      <GameResultModal
        open={result !== null}
        title={result?.won ? 'Победа! 🎉' : 'Проигрыш 💥'}
        message={result?.won ? `Время: ${result.seconds} с` : 'Попробуй ещё раз'}
        isRecord={result?.isRecord ?? false}
        onClose={() => setResult(null)}
        onRestart={() => resetGame(difficulty)}
      />
    </div>
  )
}
