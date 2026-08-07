export interface MemoryCard {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

export interface MemoryGameState {
  cards: MemoryCard[]
  moves: number
  matchedPairs: number
  firstIndex: number | null
}

const EMOJIS = [
  '📘', '📗', '📙', '📕', '📐', '📏',
  '✏️', '🖊️', '🖍️', '📌', '📎', '🔖',
  '🧮', '🎒', '📚', '✂️', '🔬', '🔭',
]

export function createDeck(rows: number, cols: number): MemoryCard[] {
  const pairCount = (rows * cols) / 2
  const emojis = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, pairCount)
  const cards = [...emojis, ...emojis]
    .sort(() => Math.random() - 0.5)
    .map((emoji, id) => ({ id, emoji, isFlipped: false, isMatched: false }))
  return cards
}

export function flipCard(state: MemoryGameState, index: number): MemoryGameState {
  const card = state.cards[index]
  if (!card || card.isFlipped || card.isMatched) return state
  if (state.firstIndex === null) {
    return {
      ...state,
      cards: state.cards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c)),
      firstIndex: index,
    }
  }
  // Second card of a pair — resolve immediately.
  const a = state.firstIndex
  const cards = state.cards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c))
  const isMatch = cards[a].emoji === cards[index].emoji
  if (isMatch) {
    return {
      cards: cards.map((c, i) => (i === a || i === index ? { ...c, isMatched: true } : c)),
      moves: state.moves + 1,
      matchedPairs: state.matchedPairs + 1,
      firstIndex: null,
    }
  }
  return {
    cards: cards.map((c, i) => (i === a || i === index ? { ...c, isFlipped: false } : c)),
    moves: state.moves + 1,
    matchedPairs: state.matchedPairs,
    firstIndex: null,
  }
}

export function memoryWin(state: MemoryGameState): boolean {
  return state.matchedPairs === state.cards.length / 2
}
