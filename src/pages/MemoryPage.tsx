import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import DifficultyPicker from '../components/games/DifficultyPicker'
import GameResultModal from '../components/games/GameResultModal'
import MemoryBoard from '../components/games/memory/MemoryBoard'
import { createDeck, flipCard, memoryWin, type MemoryGameState } from '../lib/games/memory'
import { MEMORY_LEVELS, type GameDifficulty } from '../lib/games/types'

export default function MemoryPage() {
  const submitGameRecord = useStore((s) => s.submitGameRecord)
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [game, setGame] = useState<MemoryGameState>(() => ({
    cards: createDeck(MEMORY_LEVELS.easy.rows, MEMORY_LEVELS.easy.cols),
    moves: 0,
    matchedPairs: 0,
    firstIndex: null,
  }))
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [showPair, setShowPair] = useState<number[] | null>(null)
  const [result, setResult] = useState<{ moves: number; seconds: number; isRecord: boolean } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetGame = (d: GameDifficulty) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const level = MEMORY_LEVELS[d]
    setDifficulty(d)
    setGame({ cards: createDeck(level.rows, level.cols), moves: 0, matchedPairs: 0, firstIndex: null })
    setSeconds(0)
    setStarted(false)
    setShowPair(null)
    setResult(null)
  }

  useEffect(() => {
    if (!started || result) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [started, result])

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const handleCardClick = (index: number) => {
    if (result || showPair !== null) return
    const next = flipCard(game, index)
    if (next === game) return
    if (!started) setStarted(true)
    if (next.firstIndex === null && next.moves > game.moves) {
      // a pair was resolved on this click
      if (next.matchedPairs === game.matchedPairs) {
        // mismatch — keep both visible for 700ms
        setShowPair([game.firstIndex!, index])
        timeoutRef.current = setTimeout(() => setShowPair(null), 700)
      }
    }
    setGame(next)
    if (memoryWin(next)) {
      const isRecord = submitGameRecord('memory', difficulty, next.moves)
      setResult({ moves: next.moves, seconds, isRecord })
    }
  }

  return (
    <div>
      <PageHeader
        title="Мемори"
        subtitle="Найди все пары карточек"
        action={
          <Link to="/games" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            ← Все игры
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <DifficultyPicker value={difficulty} onChange={resetGame} disabled={started && !result} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ходы: {game.moves} · Время: {seconds} с
        </p>
        <Button variant="secondary" size="sm" onClick={() => resetGame(difficulty)}>
          Заново
        </Button>
      </div>
      <MemoryBoard cards={game.cards} showPair={showPair} cols={MEMORY_LEVELS[difficulty].cols} onCardClick={handleCardClick} />
      <GameResultModal
        open={result !== null}
        title="Победа! 🎉"
        message={result ? `Результат: ${result.moves} ходов за ${result.seconds} с` : ''}
        isRecord={result?.isRecord ?? false}
        onClose={() => setResult(null)}
        onRestart={() => resetGame(difficulty)}
      />
    </div>
  )
}
