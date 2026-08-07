export interface Cell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

export interface MinesweeperGameState {
  rows: number
  cols: number
  mines: number
  cells: Cell[]
  firstMove: boolean
  gameOver: boolean
  won: boolean
  flagsUsed: number
}

function makeCell(): Cell {
  return { mine: false, revealed: false, flagged: false, adjacent: 0 }
}

export function createMinesweeper(rows: number, cols: number, mines: number): MinesweeperGameState {
  return {
    rows,
    cols,
    mines,
    cells: Array.from({ length: rows * cols }, makeCell),
    firstMove: true,
    gameOver: false,
    won: false,
    flagsUsed: 0,
  }
}

function neighbors(state: MinesweeperGameState, i: number): number[] {
  const { rows, cols } = state
  const r = Math.floor(i / cols)
  const c = i % cols
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc)
    }
  }
  return out
}

function placeMines(state: MinesweeperGameState, safeIndex: number): MinesweeperGameState {
  const cells = state.cells.map((c) => ({ ...c }))
  const safe = new Set([safeIndex, ...neighbors(state, safeIndex)])
  const candidates = cells.map((_, i) => i).filter((i) => !safe.has(i))
  // shuffle candidates, take `mines`
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  const mineSet = new Set(candidates.slice(0, state.mines))
  for (let i = 0; i < cells.length; i++) {
    if (mineSet.has(i)) cells[i] = { ...cells[i], mine: true }
  }
  // adjacent counts
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].mine) continue
    let n = 0
    for (const nb of neighbors(state, i)) {
      if (cells[nb].mine) n++
    }
    cells[i] = { ...cells[i], adjacent: n }
  }
  return { ...state, cells, firstMove: false }
}

export function openCell(state: MinesweeperGameState, index: number): MinesweeperGameState {
  if (state.gameOver) return state
  const cell = state.cells[index]
  if (cell.revealed || cell.flagged) return state

  let next = state.firstMove ? placeMines(state, index) : state

  // reveal target cell
  const target = next.cells[index]
  if (target.mine) {
    const cells = next.cells.map((c) => (c.mine ? { ...c, revealed: true } : c))
    return { ...next, cells, gameOver: true }
  }

  const cells = next.cells.map((c) => ({ ...c }))
  const stack = [index]
  while (stack.length > 0) {
    const i = stack.pop()!
    const c = cells[i]
    if (c.revealed || c.flagged || c.mine) continue
    cells[i] = { ...c, revealed: true }
    if (c.adjacent === 0) {
      for (const nb of neighbors(next, i)) {
        const n = cells[nb]
        if (!n.revealed && !n.flagged && !n.mine) stack.push(nb)
      }
    }
  }

  const safeCount = next.cells.length - next.mines
  const revealedSafe = cells.filter((c) => c.revealed && !c.mine).length
  if (revealedSafe === safeCount) {
    return { ...next, cells, won: true, gameOver: true }
  }
  return { ...next, cells }
}

export function toggleFlag(state: MinesweeperGameState, index: number): MinesweeperGameState {
  if (state.gameOver) return state
  const cell = state.cells[index]
  if (cell.revealed) return state
  const flagged = !cell.flagged
  return {
    ...state,
    cells: state.cells.map((c, i) => (i === index ? { ...c, flagged } : c)),
    flagsUsed: state.flagsUsed + (flagged ? 1 : -1),
  }
}

export function minesweeperWin(state: MinesweeperGameState): boolean {
  return state.cells.every((c) => c.mine || c.revealed)
}
