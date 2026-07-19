"use client"

import { useState } from "react"
import { createTemplateFromWorkout } from "@/lib/workout-templates"
import type { AnyWorkout } from "./WorkoutCard"

type SaveAsTemplateActionProps = {
  workout: AnyWorkout
  onSaved: () => void
}

/**
 * Transforma um treino existente em template — não copia status de
 * conclusão, timestamps históricos, volume calculado ou PRs (Fase 22).
 */
export function SaveAsTemplateAction({ workout, onSaved }: SaveAsTemplateActionProps) {
  const [saving, setSaving] = useState(false)

  function handleClick() {
    setSaving(true)
    const exercises = workout.exercises.map((ex) => {
      const target = workout.targets?.find((t) => t.exerciseId === ex.id)
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        targetSets: target?.targetSets ?? null,
        targetReps: target?.targetReps ?? null,
        targetWeightKg: target?.targetWeightKg ?? null,
        targetDurationSecs: target?.targetDurationSecs ?? null,
      }
    })

    createTemplateFromWorkout({
      name: workout.name,
      estimatedMinutes: workout.estimated_minutes,
      exercises,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <button
      className="workout-row__icon-btn"
      onClick={(e) => { e.stopPropagation(); handleClick() }}
      disabled={saving}
      aria-label={`Salvar ${workout.name} como template`}
      title="Salvar como template"
    >
      📋
    </button>
  )
}
