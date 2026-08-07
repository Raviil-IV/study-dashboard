import { DIFFICULTY_LABELS, type GameDifficulty } from '../../lib/games/types'

export default function DifficultyPicker({
  value,
  onChange,
  disabled,
}: {
  value: GameDifficulty
  onChange: (d: GameDifficulty) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(['easy', 'medium', 'hard'] as const).map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            value === d
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700'
          }`}
        >
          {DIFFICULTY_LABELS[d]}
        </button>
      ))}
    </div>
  )
}
