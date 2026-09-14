import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ActivityChart from './ActivityChart'

const data = Array.from({ length: 30 }, (_, i) => ({
  day: `2026-01-${String(i + 1).padStart(2, '0')}`,
  visits: i % 5 === 0 ? 2 : 0,
  tasksDone: i % 3 === 0 ? 1 : 0,
}))

describe('ActivityChart', () => {
  it('renders two bars per day', () => {
    const { container } = render(<ActivityChart data={data} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('rect')).toHaveLength(60)
  })

  it('renders nothing for empty data', () => {
    const { container } = render(<ActivityChart data={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})