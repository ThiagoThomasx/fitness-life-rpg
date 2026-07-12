"use client"

import type { Exercise, ExerciseSet } from "@/types/database"
import type { ExerciseTarget } from "@/lib/custom-workouts"
import type { ProgressionSuggestion } from "@/lib/progression"
import { AddSetForm } from "./AddSetForm"

type SetData = Omit<ExerciseSet, "id" | "session_id" | "created_at" | "is_pr">

type SessionExerciseCardProps = {
  exercise: Exercise
  sets: SetData[]
  target?: ExerciseTarget
  suggestion: ProgressionSuggestion
  isPr: boolean
  lastExecution?: { weightKg: number; reps: number; date: string } | null
  onAddSet: (weight: number, reps: number) => void
  onRemoveSet: (setIndex: number) => void
  onRemoveExercise: () => void
}

export function SessionExerciseCard({
  exercise,
  sets,
  target,
  suggestion,
  isPr,
  lastExecution,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: SessionExerciseCardProps) {
  const suggestedWeight =
    sets.length === 0 ? suggestion.suggestedWeightKg ?? target?.targetWeightKg ?? null : null
  const suggestedReps =
    sets.length === 0 ? suggestion.suggestedReps ?? target?.targetReps ?? 10 : undefined
  const isDone = Boolean(target && sets.length >= target.targetSets)

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
        <div className="text-xs text-muted mb-2">
          Última vez: {lastExecution.weightKg > 0 ? `${lastExecution.weightKg}kg × ` : ""}
          {lastExecution.reps} reps
        </div>
      )}

      {/* Meta do treino + sugestão baseada no desempenho anterior */}
      {(target || sets.length === 0) && suggestion.note && (
        <div className="target-hint">
          {target && (
            <span className="target-hint__goal">
              🎯 {target.targetSets}×{target.targetReps ?? "—"}
              {target.targetWeightKg ? ` @ ${target.targetWeightKg}kg` : ""}
            </span>
          )}
          <span className="target-hint__note">{suggestion.note}</span>
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
