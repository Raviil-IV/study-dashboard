import type { TrendDay } from '../../types/admin'

const WIDTH = 100
const HEIGHT = 160
const PADDING = 4

function maxValue(data: TrendDay[]): number {
  const m = Math.max(...data.map((d) => Math.max(d.visits, d.tasksDone)))
  return m > 0 ? m : 1
}

export default function ActivityChart({ data }: { data: TrendDay[] }) {
  if (data.length === 0) return null
  const max = maxValue(data)
  const slot = WIDTH / data.length
  const barW = Math.max(1, slot * 0.35)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-40 w-full" role="img" aria-label="Активность за 7 дней">
      {data.map((d, i) => {
        const x = i * slot + (slot - barW) / 2
        const hVisits = (d.visits / max) * (HEIGHT - PADDING * 2)
        const hTasks = (d.tasksDone / max) * (HEIGHT - PADDING * 2)
        return (
          <g key={d.day}>
            <rect x={x} y={HEIGHT - hVisits - PADDING} width={barW} height={Math.max(hVisits, 1)} className="fill-indigo-500" />
            <rect x={x + barW} y={HEIGHT - hTasks - PADDING} width={barW} height={Math.max(hTasks, 1)} className="fill-emerald-500" />
          </g>
        )
      })}
    </svg>
  )
}