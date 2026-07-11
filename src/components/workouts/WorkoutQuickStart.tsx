"use client"

import type { AnyWorkout } from "./WorkoutCard"

type WorkoutQuickStartProps = {
  workout: AnyWorkout
  reason: string
  onStart: () => void
}

export function WorkoutQuickStart({ workout, reason, onStart }: WorkoutQuickStartProps) {
  return (
    <section className="quickstart" aria-label="Treino recomendado">
      <div className="quickstart__icon" aria-hidden="true">
        {workout.workout_type.icon ?? "🏋️"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="badge-recommended">✨ para você</span>
        </div>
        <div className="mt-0.5 truncate text-sm font-bold text-primary">{workout.name}</div>
        <div className="truncate text-xs text-muted">
          ~{workout.estimated_minutes}min · {reason}
        </div>
      </div>
      <button type="button" className="btn btn--primary" onClick={onStart}>
        Iniciar
      </button>
    </section>
  )
}
