"use client"

import { useId } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import type { PlannedWorkout } from "@/lib/planned-workouts"
import type { WorkoutTemplateExercise } from "@/lib/workout-templates"

function formatTargets(exercise: WorkoutTemplateExercise): string {
  const parts: string[] = []
  if (exercise.sets && exercise.reps) parts.push(`${exercise.sets}x${exercise.reps}`)
  else if (exercise.sets) parts.push(`${exercise.sets} séries`)
  else if (exercise.reps) parts.push(exercise.reps)
  if (exercise.loadKg) parts.push(`${exercise.loadKg}kg`)
  if (exercise.durationSeconds) parts.push(`${exercise.durationSeconds}s`)
  if (exercise.distanceMeters) parts.push(`${exercise.distanceMeters}m`)
  if (exercise.restSeconds) parts.push(`descanso ${exercise.restSeconds}s`)
  if (exercise.rir !== undefined) parts.push(`RIR ${exercise.rir}`)
  if (exercise.rpe !== undefined) parts.push(`RPE ${exercise.rpe}`)
  if (exercise.tempo) parts.push(`tempo ${exercise.tempo}`)
  return parts.length > 0 ? parts.join(" · ") : "Sem alvo definido"
}

type PlannedWorkoutPreviewDialogProps = {
  workout: PlannedWorkout
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Prévia antes de iniciar pelo Planner (Fase 11). Só confirma/cancela nesta
 * parte — ajustar exercícios antes de iniciar ("Revisar sessão", Fase 13)
 * fica para a Parte 4B.
 */
export function PlannedWorkoutPreviewDialog({ workout, onConfirm, onCancel }: PlannedWorkoutPreviewDialogProps) {
  const titleId = useId()
  const exercises = workout.templateSnapshot.exerciseBlocks

  return (
    <ModalShell labelledBy={titleId} onClose={onCancel}>
      <h3 id={titleId} className="modal-title">{workout.name}</h3>
      <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
        {workout.date}
        {workout.templateSnapshot.estimatedDurationMinutes && ` · ~${workout.templateSnapshot.estimatedDurationMinutes} min`}
        {workout.isDeload && " · deload"}
      </p>

      <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-3)", maxHeight: "50vh", overflowY: "auto" }}>
        {exercises.map((block) => (
          <div key={block.id} className="target-card" style={{ cursor: "default" }}>
            <span className="text-sm font-semibold text-primary">{block.exercise.exerciseName}</span>
            <div className="text-xs text-muted">{formatTargets(block.exercise)}</div>
          </div>
        ))}
      </div>

      {workout.notes && (
        <p className="text-xs text-secondary" style={{ marginTop: "var(--space-2)" }}>{workout.notes}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn--primary" onClick={onConfirm}>Iniciar como planejado</button>
      </div>
    </ModalShell>
  )
}
