"use client"

import type { Exercise, ExerciseSet } from "@/types/database"
import type { ExerciseTarget } from "@/lib/custom-workouts"
import type { WorkoutRecommendation } from "@/lib/workout-intelligence"
import type { AdjustedExerciseTarget } from "@/lib/session-adjustments"
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
  adjustedTarget?: AdjustedExerciseTarget | null
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
  adjustedTarget,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: SessionExerciseCardProps) {
  const hasAdjustment =
    adjustedTarget !== null &&
    adjustedTarget !== undefined &&
    !adjustedTarget.progressionTargetSuppressed === false ||
    (adjustedTarget !== null &&
      adjustedTarget !== undefined &&
      (adjustedTarget.adjustedWeight !== adjustedTarget.originalWeight ||
        adjustedTarget.adjustedSets !== adjustedTarget.originalSets))

  // Effective weight for the AddSetForm default: use adjusted if available
  const effectiveWeight =
    adjustedTarget?.adjustedWeight !== undefined && adjustedTarget.adjustedWeight !== adjustedTarget.originalWeight
      ? adjustedTarget.adjustedWeight
      : recommendation.suggestedWeight ?? target?.targetWeightKg ?? null

  const suggestedWeight = sets.length === 0 ? effectiveWeight : null
  const suggestedReps =
    sets.length === 0
      ? (recommendation.suggestedReps ?? target?.targetReps ?? 10)
      : undefined
  const effectiveSets = adjustedTarget?.adjustedSets ?? target?.targetSets
  const isDone = Boolean(effectiveSets && sets.length >= effectiveSets)
  const nextGoal = sets.length === 0 ? (adjustedTarget?.progressionTargetSuppressed ? null : formatNextGoal(recommendation)) : null

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
      {target && sets.length === 0 && !hasAdjustment && (
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

      {/* Meta ajustada para hoje */}
      {adjustedTarget && hasAdjustment && sets.length === 0 && (
        <div className="target-hint target-hint--adjusted">
          {adjustedTarget.originalWeight !== undefined && adjustedTarget.adjustedWeight !== adjustedTarget.originalWeight && (
            <div className="target-hint__comparison">
              <span className="target-hint__original">
                Plano original: {adjustedTarget.originalSets ?? target?.targetSets ?? "—"}×
                {target?.targetReps ?? "—"} @ {adjustedTarget.originalWeight}kg
              </span>
              <span className="target-hint__adjusted">
                🎯 Meta de hoje: {adjustedTarget.adjustedSets ?? effectiveSets ?? "—"}×
                {target?.targetReps ?? "—"} @ {adjustedTarget.adjustedWeight}kg
              </span>
            </div>
          )}
          {adjustedTarget.originalSets !== undefined &&
            adjustedTarget.adjustedSets !== undefined &&
            adjustedTarget.adjustedSets !== adjustedTarget.originalSets &&
            (adjustedTarget.originalWeight === undefined || adjustedTarget.adjustedWeight === adjustedTarget.originalWeight) && (
            <div className="target-hint__comparison">
              <span className="target-hint__original">
                Plano original: {adjustedTarget.originalSets} séries
              </span>
              <span className="target-hint__adjusted">
                🎯 Meta de hoje: {adjustedTarget.adjustedSets} séries
              </span>
            </div>
          )}
          {adjustedTarget.progressionTargetSuppressed && (
            <span className="target-hint__note">
              Meta de progressão preservada para a próxima sessão.
            </span>
          )}
          {recommendation.reason && !adjustedTarget.progressionTargetSuppressed && (
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
