"use client"

import type { ExerciseIntelligence, ExerciseStatus } from "@/lib/workout-intelligence"

const STATUS_CONFIG: Record<
  ExerciseStatus,
  { label: string; icon: string; color: string }
> = {
  improving: { label: "Evoluindo", icon: "📈", color: "var(--color-accent)" },
  stable: { label: "Estável", icon: "→", color: "var(--color-secondary)" },
  stagnant: { label: "Estagnado", icon: "⏸", color: "var(--color-warning, #f59e0b)" },
  regressing: { label: "Em queda", icon: "📉", color: "var(--color-danger, #f87171)" },
  insufficient_data: { label: "Poucos dados", icon: "💡", color: "var(--color-text-muted)" },
}

const STATUS_ORDER: ExerciseStatus[] = [
  "improving",
  "stable",
  "stagnant",
  "regressing",
  "insufficient_data",
]

type TrainingIntelligenceSectionProps = {
  exercises: ExerciseIntelligence[]
}

export function TrainingIntelligenceSection({ exercises }: TrainingIntelligenceSectionProps) {
  const grouped = new Map<ExerciseStatus, ExerciseIntelligence[]>()
  for (const status of STATUS_ORDER) {
    grouped.set(status, [])
  }
  for (const ex of exercises) {
    grouped.get(ex.status)?.push(ex)
  }

  const activeGroups = STATUS_ORDER.filter(
    (s) => s !== "insufficient_data" && (grouped.get(s)?.length ?? 0) > 0
  )

  if (activeGroups.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="training-intel-heading" className="card">
      <div className="section-label" id="training-intel-heading">
        Inteligência de Treino
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {activeGroups.map((status) => {
          const config = STATUS_CONFIG[status]
          const items = grouped.get(status) ?? []
          return (
            <div
              key={status}
              className="rounded-lg p-3"
              style={{ background: "var(--color-surface-elevated)" }}
            >
              <div
                className="flex items-center gap-1.5 mb-2 text-xs font-semibold"
                style={{ color: config.color }}
              >
                <span aria-hidden="true">{config.icon}</span>
                <span>{config.label}</span>
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5 text-xs"
                  style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                >
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {items.slice(0, 4).map((ex) => (
                  <div key={ex.exerciseId} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-secondary">
                      {ex.exerciseName}
                    </span>
                    {ex.recommendation.suggestedWeight != null && (
                      <span className="flex-shrink-0 text-xs text-muted">
                        {ex.recommendation.suggestedWeight}kg
                      </span>
                    )}
                  </div>
                ))}
                {items.length > 4 && (
                  <div className="text-xs text-muted">+{items.length - 4} mais</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
