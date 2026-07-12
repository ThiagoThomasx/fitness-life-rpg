"use client"

import { useId } from "react"
import type { Exercise } from "@/types/database"
import { getAllExercises } from "@/lib/custom-workouts"
import { ModalShell } from "@/components/ui/ModalShell"

type ExercisePickerModalProps = {
  alreadyAdded: string[]
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePickerModal({ alreadyAdded, onPick, onClose }: ExercisePickerModalProps) {
  const titleId = useId()

  return (
    <ModalShell labelledBy={titleId} variant="sheet" onClose={onClose}>
      <div className="modal-header">
        <h3 id={titleId} className="modal-title">Adicionar exercício</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {getAllExercises().map((exercise) => {
          const isAdded = alreadyAdded.includes(exercise.id)
          return (
            <button
              key={exercise.id}
              type="button"
              className="picker-row"
              disabled={isAdded}
              onClick={() => { onPick(exercise); onClose() }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-primary">
                  {exercise.name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {exercise.muscle_groups.join(", ")}
                </span>
              </span>
              {isAdded && <span className="flex-shrink-0 text-xs text-muted">Adicionado</span>}
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}
