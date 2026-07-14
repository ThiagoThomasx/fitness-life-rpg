"use client"

import type { Exercise, ExerciseSet } from "@/types/database"
import type { ExerciseTarget } from "@/lib/custom-workouts"
import type { WorkoutRecommendation } from "@/lib/workout-intelligence"
import { AddSetForm } from "./AddSetForm"

type SetData = Omit<ExerciseSet, "id" | "session_id" | "created_at" | "is_pr">

type SessionExerciseCardProps = {
  exercise: Exercise
  sets: SetData[]
  target?: ExerciseTarget
  recommendation: WorkoutRecommendation
  isPr: boolean
  lastExecution?: { weightKg: number; reps: number; date: string } | null
  readinessHint?: string | null
  onAddSet: (weight: number, reps: number) => void
  onRemoveSet: (setIndex: number) => void
  onRemoveExercise: () => void
}

const CONFIDENCE_ICON: Record<WorkoutRecommendation["confidence"], string> = {
  high: "🎯",
  medium: "📊",
  low: "💡",
}

function formatNextGoal(rec: WorkoutRecommendation): string | null {
  if (rec.type === "insufficient_data") return null
  if (rec.type === "deload") {
    return rec.suggestedWeight != null
      ? `Deload: ${rec.suggestedWeight}kg × ${rec.suggestedReps ?? 10}`
      : "Deload leve"
  }
  if (rec.type === "maintain") {
    if (rec.suggestedWeight != null && rec.suggestedReps != null) {
      return `${rec.suggestedWeight}kg × ${rec.suggestedReps}`
    }
    return "Consolide a carga atual"
  }
  if (rec.suggestedWeight != null && rec.suggestedReps != null) {
    return `${rec.suggestedWeight}kg × ${rec.suggestedReps}`
  }
  if (rec.suggestedReps != null) return `${rec.suggestedReps} reps`
  return null
}

export function SessionExerciseCard({
  exercise,
  sets,
  target,
  recommendation,
  isPr,
  lastExecution,
  readinessHint,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: SessionExerciseCardProps) {
  const suggestedWeight =
    sets.length === 0
      ? (recommendation.suggestedWeight ?? target?.targetWeightKg ?? null)
      : null
  const suggestedReps =
    sets.length === 0
      ? (recommendation.suggestedReps ?? target?.targetReps ?? 10)
      : undefined
  const isDone = Boolean(target && sets.length >= target.targetSets)
  const nextGoal = sets.length === 0 ? formatNextGoal(recommendation) : null

  return (
    <article className="exercise-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-base font-bold text-primary">{exercise.name}</h3>
        <div className="flex flex-shrink-0 items-center gap-2">
          {isDone && (
            <span className="exercise-card__done">
              <span aria-hidden="true">✓</span> Concluído
            </span>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={onRemoveExercise}
            aria-label={`Remover ${exercise.name} da sessão`}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mb-2 text-xs text-muted">{exercise.muscle_groups.join(", ")}</div>

      {lastExecution && sets.length === 0 && (
        <div className="text-xs text-muted mb-1">
          Última vez: {lastExecution.weightKg > 0 ? `${lastExecution.weightKg}kg × ` : ""}
          {lastExecution.reps} reps
        </div>
      )}

      {nextGoal && sets.length === 0 && (
        <div className="text-xs mb-2" style={{ color: "var(--color-accent)" }}>
          {CONFIDENCE_ICON[recommendation.confidence]} Próxima meta: {nextGoal}
        </div>
      )}

      {readinessHint && sets.length === 0 && (
        <div className="readiness-hint" role="note" aria-label="Orientação de hoje">
          <span className="readiness-hint__icon" aria-hidden="true">⚡</span>
          <span className="readiness-hint__text">{readinessHint}</span>
        </div>
      )}

      {/* Meta do treino conforme plano */}
      {target && sets.length === 0 && (
        <div className="target-hint">
          <span className="target-hint__goal">
            🎯 {target.targetSets}×{target.targetReps ?? "—"}
            {target.targetWeightKg ? ` @ ${target.targetWeightKg}kg` : ""}
          </span>
          {recommendation.reason && (
            <span className="target-hint__note">{recommendation.reason}</span>
          )}
        </div>
      )}

      {sets.length > 0 && (
        <div>
          <div className="set-grid set-grid--head" aria-hidden="true">
            <span style={{ textAlign: "center" }}>#</span>
            <span style={{ textAlign: "center" }}>Peso</span>
            <span style={{ textAlign: "center" }}>Reps</span>
            <span />
            <span />
          </div>
          {sets.map((set, i) => (
            <div key={i} className="set-grid set-grid--row">
              <span className="set-grid__num">
                <span className="set-grid__check" aria-hidden="true">✓</span>
                {i + 1}
              </span>
              <span className="set-grid__value">{set.weight_kg} kg</span>
              <span className="set-grid__value">{set.reps} reps</span>
              {isPr ? (
                <span className="badge-pill badge-pill--streak">PR</span>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="icon-btn"
                onClick={() => onRemoveSet(i)}
                aria-label={`Remover série ${i + 1} de ${exercise.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <AddSetForm
        defaultWeight={suggestedWeight}
        defaultReps={suggestedReps}
        onAdd={onAddSet}
      />
    </article>
  )
}
