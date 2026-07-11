"use client"

type Props = {
  value: number
  onChange?: (v: number) => void
}

export function EnergyStars({ value, onChange }: Props) {
  return (
    <div className="energy-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className="energy-star"
          style={{ opacity: n <= value ? 1 : 0.25, cursor: onChange ? "pointer" : "default" }}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}
