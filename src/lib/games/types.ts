export type GameId = 'memory' | 'snake' | 'minesweeper'

export type GameDifficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
}

export const MEMORY_LEVELS: Record<GameDifficulty, { rows: number; cols: number }> = {
  easy: { rows: 4, cols: 4 },
  medium: { rows: 4, cols: 6 },
  hard: { rows: 6, cols: 6 },
}

export const SNAKE_SIZE = 15

export const SNAKE_SPEEDS: Record<GameDifficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 70,
}

export const MINESWEEPER_LEVELS: Record<GameDifficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
}

export type GameRecord = Record<GameId, Partial<Record<GameDifficulty, number>>>
