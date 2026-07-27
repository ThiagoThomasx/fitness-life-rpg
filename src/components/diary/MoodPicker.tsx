"use client"

export const MOODS = [
  { emoji: "😔", label: "Ruim" },
  { emoji: "😐", label: "Ok" },
  { emoji: "😊", label: "Bem" },
  { emoji: "😁", label: "Ótimo" },
  { emoji: "🔥", label: "Top" },
]

type Props = {
  value: string
  onChange?: (v: string) => void
}

export function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="mood-picker" role="group" aria-label="Humor">
      {MOODS.map((m) => (
        <button
          key={m.emoji}
          type="button"
          onClick={() => onChange?.(m.emoji)}
          aria-label={m.label}
          aria-pressed={value === m.emoji}
          className={value === m.emoji ? "mood-chip mood-chip--active" : "mood-chip"}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  )
}
