import { describe, expect, it } from 'vitest'
import { createMinesweeper, openCell, toggleFlag, minesweeperWin, type MinesweeperGameState } from './minesweeper'

function idx(state: MinesweeperGameState, row: number, col: number): number {
  return row * state.cols + col
}

describe('minesweeper', () => {
  it('creates a field with the right dimensions and mine count', () => {
    const g = createMinesweeper(9, 9, 10)
    expect(g.cells).toHaveLength(81)
    expect(g.mines).toBe(10)
    expect(g.firstMove).toBe(true)
    expect(g.gameOver).toBe(false)
    expect(g.won).toBe(false)
    expect(g.cells.every((c) => !c.mine)).toBe(true) // no mines until first click
  })

  it('first click never hits a mine and places exactly the mine count', () => {
    const g = createMinesweeper(5, 5, 8)
    const after = openCell(g, idx(g, 2, 2))
    expect(after.cells[idx(after, 2, 2)].mine).toBe(false)
    expect(after.cells[idx(after, 2, 2)].revealed).toBe(true)
    const mineCount = after.cells.filter((c) => c.mine).length
    expect(mineCount).toBe(8)
    expect(after.firstMove).toBe(false)
  })

  it('opens a whole empty region with flood fill', () => {
    const g = createMinesweeper(5, 5, 3)
    // place mines manually far from a corner, then open the corner
    let g2: MinesweeperGameState = { ...g, firstMove: false, cells: g.cells.map((c) => ({ ...c })) }
    for (const [r, c] of [
      [2, 2],
      [2, 3],
      [4, 0],
    ]) {
      g2.cells[idx(g2, r, c)] = { ...g2.cells[idx(g2, r, c)], mine: true }
    }
    const after = openCell(g2, idx(g2, 0, 0))
    // corner region opens; mine cells stay hidden; game continues
    expect(after.cells[idx(after, 0, 0)].revealed).toBe(true)
    expect(after.cells[idx(after, 0, 1)].revealed).toBe(true)
    expect(after.cells[idx(after, 1, 0)].revealed).toBe(true)
    expect(after.cells[idx(after, 1, 1)].revealed).toBe(true)
    expect(after.cells[idx(after, 2, 2)].revealed).toBe(false) // mine
    expect(after.cells[idx(after, 4, 0)].revealed).toBe(false) // mine
  })

  it('ends the game when opening a mine', () => {
    const g = createMinesweeper(5, 5, 3)
    let g2: MinesweeperGameState = { ...g, firstMove: false, cells: g.cells.map((c) => ({ ...c })) }
    g2.cells[idx(g2, 2, 2)] = { ...g2.cells[idx(g2, 2, 2)], mine: true }
    const after = openCell(g2, idx(g2, 2, 2))
    expect(after.gameOver).toBe(true)
    expect(after.won).toBe(false)
  })

  it('wins when all safe cells are revealed', () => {
    const g = createMinesweeper(3, 3, 1)
    let g2: MinesweeperGameState = { ...g, firstMove: false, cells: g.cells.map((c) => ({ ...c })) }
    g2.cells[idx(g2, 2, 2)] = { ...g2.cells[idx(g2, 2, 2)], mine: true }
    // reveal the other 8 cells
    for (let i = 0; i < 9; i++) {
      if (i === idx(g2, 2, 2)) continue
      g2 = openCell(g2, i)
    }
    expect(g2.won).toBe(true)
    expect(g2.gameOver).toBe(true)
    expect(minesweeperWin(g2)).toBe(true)
  })

  it('toggles flags and never flags revealed cells', () => {
    const g = createMinesweeper(9, 9, 10)
    const flagged = toggleFlag(g, 5)
    expect(flagged.cells[5].flagged).toBe(true)
    expect(flagged.flagsUsed).toBe(1)
    const unflagged = toggleFlag(flagged, 5)
    expect(unflagged.cells[5].flagged).toBe(false)
    expect(unflagged.flagsUsed).toBe(0)

    let g2: MinesweeperGameState = { ...g, firstMove: false, cells: g.cells.map((c) => ({ ...c })) }
    g2.cells[0] = { ...g2.cells[0], revealed: true }
    const noFlag = toggleFlag(g2, 0)
    expect(noFlag.cells[0].flagged).toBe(false)
  })

  it('detects win via minesweeperWin helper', () => {
    const g = createMinesweeper(3, 3, 1)
    let g2: MinesweeperGameState = { ...g, firstMove: false, cells: g.cells.map((c) => ({ ...c })) }
    g2.cells[idx(g2, 2, 2)] = { ...g2.cells[idx(g2, 2, 2)], mine: true }
    for (let i = 0; i < 9; i++) {
      if (i === idx(g2, 2, 2)) continue
      g2 = openCell(g2, i)
    }
    expect(minesweeperWin(g2)).toBe(true)
    expect(minesweeperWin(createMinesweeper(9, 9, 10))).toBe(false)
  })
})
