"use client"

type Props = {
  label: string
  value: number
  goal: number
  color: string
}

export function MacroBar({ label, value, goal, color }: Props) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0
  const over = value > goal
  return (
    <div>
      <div className="macro-bar__row">
        <span className="macro-bar__label">{label}</span>
        <span className={over ? "macro-bar__value macro-bar__value--over" : "macro-bar__value"}>
          {value}g <span className="macro-bar__goal">/ {goal}g</span>
        </span>
      </div>
      <div className="macro-bar__track">
        <div
          className="macro-bar__fill"
          style={{ width: `${pct}%`, background: over ? "var(--color-danger)" : color }}
        />
      </div>
    </div>
  )
}
