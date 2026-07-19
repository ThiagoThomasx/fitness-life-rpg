"use client"

import type { MockWorkout } from "@/lib/mock/data"
import type { ExerciseTarget } from "@/lib/custom-workouts"
import { categoryColor } from "@/lib/theme-colors"
import type { WorkoutRecoveryInfo } from "@/lib/workout-recovery"
import { WorkoutStatus } from "./WorkoutStatus"

export type AnyWorkout = MockWorkout & { isCustom?: boolean; targets?: ExerciseTarget[] }

type WorkoutCardProps = {
  workout: AnyWorkout
  onStart: () => void
  onDelete?: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  isRecommended?: boolean
  lastCompletedAt?: string
  recovery?: WorkoutRecoveryInfo
  isTopRecoveryPick?: boolean
  extraActions?: React.ReactNode
}

function formatLastCompleted(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
}

export function WorkoutCard({
  workout,
  onStart,
  onDelete,
  onEdit,
  onDuplicate,
  isRecommended,
  lastCompletedAt,
  recovery,
  isTopRecoveryPick,
  extraActions,
}: WorkoutCardProps) {
  // Cor dinâmica por categoria — mapa centralizado em theme-colors.ts
  const colors = categoryColor(workout.workout_type.category)

  return (
    <article className="workout-row">
      <div className="workout-row__thumbnail" style={{ background: colors.bg }}>
        <span aria-hidden="true">{workout.workout_type.icon ?? "🏋️"}</span>
        <div className="workout-row__play-btn" aria-hidden="true" style={{ pointerEvents: "none" }}>
          <div className="workout-row__play-icon">▶</div>
        </div>
      </div>

      <div className="workout-row__info">
        <div className="flex items-center gap-1.5">
          <span className="workout-row__category" style={{ color: colors.text }}>
            {workout.workout_type.name}
          </span>
          {workout.isCustom && (
            <span className="badge-pill badge-pill--level" style={{ fontSize: "0.6rem" }}>
              custom
            </span>
          )}
          {isRecommended && !workout.isCustom && (
            <span className="badge-recommended">✨ para você</span>
          )}
        </div>
        <div className="workout-row__name">{workout.name}</div>
        <div className="workout-row__meta">
          ~{workout.estimated_minutes}min&nbsp;·&nbsp;+{workout.workout_type.base_xp} XP&nbsp;·&nbsp;
          {workout.exercises.length} exercício{workout.exercises.length !== 1 ? "s" : ""}
          {lastCompletedAt && (
            <>&nbsp;·&nbsp;último em {formatLastCompleted(lastCompletedAt)}</>
          )}
        </div>
        {recovery && (
          <div className="workout-row__recovery">
            <WorkoutStatus recovery={recovery} isTopPick={isTopRecoveryPick} />
          </div>
        )}
      </div>

      <div className="workout-row__actions">
        {extraActions}
        {onDuplicate && (
          <button
            className="workout-row__icon-btn"
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            aria-label={`Duplicar treino ${workout.name}`}
            title="Duplicar treino"
          >⧉</button>
        )}
        {onEdit && (
          <button
            className="workout-row__icon-btn"
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            aria-label={`Editar treino ${workout.name}`}
            title="Editar treino"
          >✏️</button>
        )}
        {onDelete && (
          <button
            className="workout-row__icon-btn"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            aria-label={`Excluir treino ${workout.name}`}
            title="Excluir treino"
          >🗑️</button>
        )}
        <button
          className="workout-row__start-btn"
          onClick={onStart}
          aria-label={`Iniciar treino ${workout.name}`}
        >
          Iniciar
        </button>
      </div>
    </article>
  )
}
