"use client"

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type Props = {
  calories: number
  goal: number
}

export function CalorieRing({ calories, goal }: Props) {
  const pct = goal > 0 ? Math.min((calories / goal) * 100, 100) : 0
  const over = calories > goal
  const color = over ? "var(--color-danger)" : "var(--color-info)"

  return (
    <div className="calorie-ring">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="var(--color-surface-active)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={RADIUS} fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
          strokeLinecap="round"
          className="calorie-ring__progress"
        />
      </svg>
      <div className="calorie-ring__value">
        <span className="calorie-ring__number" style={{ color: over ? "var(--color-danger)" : "var(--color-text-primary)" }}>
          {calories}
        </span>
        <span className="calorie-ring__unit">kcal</span>
      </div>
    </div>
  )
}
