import { describe, expect, it } from 'vitest'
import { createDeck, flipCard, memoryWin, type MemoryGameState } from './memory'
import { MEMORY_LEVELS } from './types'

describe('memory', () => {
  it('creates a deck with rows*cols cards and even pair counts', () => {
    const deck = createDeck(4, 4)
    expect(deck).toHaveLength(16)
    const counts = new Map<string, number>()
    for (const c of deck) counts.set(c.emoji, (counts.get(c.emoji) ?? 0) + 1)
    for (const count of counts.values()) expect(count).toBe(2)
    expect(counts.size).toBe(8)
  })

  it('supports all difficulty grid sizes', () => {
    for (const d of Object.values(MEMORY_LEVELS)) {
      expect(createDeck(d.rows, d.cols)).toHaveLength(d.rows * d.cols)
    }
  })

  it('matches two flipped cards and increments moves and pairs', () => {
    const deck = createDeck(4, 4)
    const a = deck.findIndex((c) => c.emoji === deck[0].emoji)
    const b = deck.findIndex((c, i) => i !== a && c.emoji === deck[a].emoji)
    let state: MemoryGameState = { cards: deck, moves: 0, matchedPairs: 0, firstIndex: null }
    state = flipCard(state, a)
    expect(state.firstIndex).toBe(a)
    state = flipCard(state, b)
    expect(state.cards[a].isMatched).toBe(true)
    expect(state.cards[b].isMatched).toBe(true)
    expect(state.moves).toBe(1)
    expect(state.matchedPairs).toBe(1)
    expect(state.firstIndex).toBeNull()
  })

  it('flips two non-matching cards back', () => {
    const deck = createDeck(4, 4)
    const a = 0
    const b = deck.findIndex((c, i) => i !== a && c.emoji !== deck[a].emoji)
    let state: MemoryGameState = { cards: deck, moves: 0, matchedPairs: 0, firstIndex: null }
    state = flipCard(state, a)
    state = flipCard(state, b)
    expect(state.cards[a].isFlipped).toBe(false)
    expect(state.cards[b].isFlipped).toBe(false)
    expect(state.moves).toBe(1)
    expect(state.firstIndex).toBeNull()
  })

  it('handles pair resolution: mismatched pair shows until reset', () => {
    const deck = createDeck(4, 4)
    const a = 0
    const b = deck.findIndex((c, i) => i !== a && c.emoji !== deck[a].emoji)
    let state: MemoryGameState = { cards: deck, moves: 0, matchedPairs: 0, firstIndex: null }
    state = flipCard(state, a)
    state = flipCard(state, b)
    // After a mismatched pair, both are unflipped (immediate reset in pure fn);
    // the UI layer handles the 700ms visual delay before calling flipCard again.
    expect(state.cards[a].isFlipped).toBe(false)
    expect(state.cards[b].isFlipped).toBe(false)
  })

  it('ignores clicks on already matched cards', () => {
    const deck = createDeck(4, 4)
    const cards = deck.map((c, i) => (i < 2 ? { ...c, isMatched: true, isFlipped: true } : c))
    let state: MemoryGameState = { cards, moves: 0, matchedPairs: 1, firstIndex: null }
    state = flipCard(state, 0)
    expect(state.moves).toBe(0)
    expect(state.cards[0].isFlipped).toBe(true)
  })

  it('detects a win when all pairs are matched', () => {
    const deck = createDeck(4, 4).map((c) => ({ ...c, isMatched: true, isFlipped: true }))
    const state: MemoryGameState = { cards: deck, moves: 8, matchedPairs: 8, firstIndex: null }
    expect(memoryWin(state)).toBe(true)
    const half = createDeck(4, 4)
    expect(memoryWin({ cards: half, moves: 0, matchedPairs: 4, firstIndex: null })).toBe(false)
  })
})
