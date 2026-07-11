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
    <div className="mood-picker">
      {MOODS.map((m) => (
        <button
          key={m.emoji}
          type="button"
          onClick={() => onChange?.(m.emoji)}
          title={m.label}
          className={value === m.emoji ? "mood-chip mood-chip--active" : "mood-chip"}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  )
}
