"use client"

export type TimeFilter = "all" | "quick" | "medium" | "long"

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "quick", label: "≤ 25min" },
  { key: "medium", label: "25–45min" },
  { key: "long", label: "> 45min" },
]

const QUICK_MAX_MINUTES = 25
const MEDIUM_MAX_MINUTES = 45

export function filterByTime<T extends { estimated_minutes: number }>(
  workouts: T[],
  filter: TimeFilter
): T[] {
  if (filter === "all") return workouts
  if (filter === "quick") return workouts.filter((w) => w.estimated_minutes <= QUICK_MAX_MINUTES)
  if (filter === "medium") {
    return workouts.filter(
      (w) => w.estimated_minutes > QUICK_MAX_MINUTES && w.estimated_minutes <= MEDIUM_MAX_MINUTES
    )
  }
  return workouts.filter((w) => w.estimated_minutes > MEDIUM_MAX_MINUTES)
}

type WorkoutFiltersProps = {
  value: TimeFilter
  onChange: (filter: TimeFilter) => void
}

export function WorkoutFilters({ value, onChange }: WorkoutFiltersProps) {
  return (
    <div className="filter-row" role="group" aria-label="Filtrar treinos por duração">
      {TIME_FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          className={value === f.key ? "filter-pill filter-pill--active" : "filter-pill"}
          aria-pressed={value === f.key}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
