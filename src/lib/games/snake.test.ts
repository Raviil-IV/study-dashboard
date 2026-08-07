import { describe, expect, it } from 'vitest'
import { createSnakeGame, setSnakeDirection, snakeStep, snakeWin, type SnakeGameState } from './snake'

describe('snake', () => {
  it('creates a game with length 3 and food on the board', () => {
    const g = createSnakeGame(10)
    expect(g.snake).toHaveLength(3)
    expect(g.score).toBe(0)
    expect(g.gameOver).toBe(false)
    expect(g.food).not.toBeNull()
    const occupied = new Set(g.snake.map((p) => `${p.x},${p.y}`))
    expect(occupied.has(`${g.food!.x},${g.food!.y}`)).toBe(false)
    for (const p of g.snake) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(10)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThan(10)
    }
  })

  it('moves the head in the current direction', () => {
    const g = createSnakeGame(10)
    const before = g.snake[0]
    const next = snakeStep(g)
    const head = next.snake[0]
    // default direction is right
    expect(head.x).toBe(before.x + 1)
    expect(head.y).toBe(before.y)
  })

  it('ignores a 180-degree direction reversal', () => {
    const g = createSnakeGame(10)
    const reversed = setSnakeDirection(g, 'left') // snake moves right by default
    expect(reversed.direction).toBe('right')
  })

  it('accepts a perpendicular direction change', () => {
    const g = createSnakeGame(10)
    const down = setSnakeDirection(g, 'down')
    expect(down.direction).toBe('down')
  })

  it('grows and scores when eating food', () => {
    let g = createSnakeGame(10)
    // place food directly ahead of the head
    const head = g.snake[0]
    g = { ...g, food: { x: head.x + 1, y: head.y } }
    const next = snakeStep(g)
    expect(next.snake).toHaveLength(4)
    expect(next.score).toBe(1)
    expect(next.food).not.toBeNull()
  })

  it('ends the game on wall collision', () => {
    let g = createSnakeGame(10)
    // position snake near the right wall heading right
    const head = g.snake[0]
    g = {
      ...g,
      snake: g.snake.map((_, i) => ({ x: 9 - i, y: head.y })),
      direction: 'right',
      food: null,
    }
    const next = snakeStep(g)
    expect(next.gameOver).toBe(true)
  })

  it('ends the game on self collision', () => {
    const g = createSnakeGame(10)
    // build a snake that will run into its own body: head at (5,5) heading right,
    // neck at (6,5) → next head hits the neck
    const snake = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ]
    const next = snakeStep({ ...g, snake, direction: 'right', food: null })
    expect(next.gameOver).toBe(true)
  })

  it('detects a win when the snake fills the board', () => {
    const size = 2
    const full: SnakeGameState = {
      size,
      snake: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      direction: 'right',
      food: null,
      score: size * size - 3,
      gameOver: false,
    }
    expect(snakeWin(full)).toBe(true)
    expect(snakeWin(createSnakeGame(10))).toBe(false)
  })
})
