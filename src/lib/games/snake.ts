export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export interface SnakeGameState {
  size: number
  snake: Point[]
  direction: Direction
  food: Point | null
  score: number
  gameOver: boolean
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export function createSnakeGame(size = 15): SnakeGameState {
  const mid = Math.floor(size / 2)
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
  const state: SnakeGameState = { size, snake, direction: 'right', food: null, score: 0, gameOver: false }
  state.food = spawnFood(state)
  return state
}

export function spawnFood(state: SnakeGameState): Point | null {
  const occupied = new Set(state.snake.map((p) => `${p.x},${p.y}`))
  const free: Point[] = []
  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) return null
  return free[Math.floor(Math.random() * free.length)]
}

export function setSnakeDirection(state: SnakeGameState, dir: Direction): SnakeGameState {
  if (state.gameOver) return state
  if (dir === OPPOSITE[state.direction]) return state
  return { ...state, direction: dir }
}

export function snakeStep(state: SnakeGameState): SnakeGameState {
  if (state.gameOver) return state
  const head = state.snake[0]
  const nextHead: Point = {
    x: head.x + (state.direction === 'right' ? 1 : state.direction === 'left' ? -1 : 0),
    y: head.y + (state.direction === 'down' ? 1 : state.direction === 'up' ? -1 : 0),
  }
  // wall collision
  if (nextHead.x < 0 || nextHead.x >= state.size || nextHead.y < 0 || nextHead.y >= state.size) {
    return { ...state, gameOver: true }
  }
  const eatsFood = state.food !== null && nextHead.x === state.food.x && nextHead.y === state.food.y
  // self collision: body except the tail (tail moves away unless growing)
  const body = eatsFood ? state.snake : state.snake.slice(0, -1)
  if (body.some((p) => p.x === nextHead.x && p.y === nextHead.y)) {
    return { ...state, gameOver: true }
  }
  const snake = [nextHead, ...state.snake]
  if (!eatsFood) snake.pop()
  const next: SnakeGameState = {
    ...state,
    snake,
    score: eatsFood ? state.score + 1 : state.score,
    food: eatsFood ? spawnFood({ ...state, snake }) : state.food,
  }
  return next
}

export function snakeWin(state: SnakeGameState): boolean {
  return state.snake.length === state.size * state.size
}
