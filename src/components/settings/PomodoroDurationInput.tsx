import { useEffect, useState } from 'react'
import Input from '../ui/Input'

interface Props {
  label: string
  min: number
  max: number
  value: number
  onCommit: (value: number) => void
}

// Keeps an editable draft while typing and only commits a validated, clamped
// number on blur or Enter, so empty or out-of-range input never reaches the server.
export default function PomodoroDurationInput({ label, min, max, value, onCommit }: Props) {
  const [draft, setDraft] = useState(String(value))

  // Sync when the committed value changes from outside (e.g. a server rollback).
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, parsed))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <Input
      label={label}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
    />
  )
}
