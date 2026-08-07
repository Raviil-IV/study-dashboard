import type { MemoryCard as MemoryCardType } from '../../../lib/games/memory'
import MemoryCard from './MemoryCard'

export default function MemoryBoard({
  cards,
  showPair,
  cols,
  onCardClick,
}: {
  cards: MemoryCardType[]
  showPair: number[] | null
  cols: number
  onCardClick: (index: number) => void
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {cards.map((card, i) => {
        const visible = card.isFlipped || card.isMatched || (showPair !== null && showPair.includes(i))
        return <MemoryCard key={card.id} card={card} index={i} visible={visible} onClick={() => onCardClick(i)} />
      })}
    </div>
  )
}
