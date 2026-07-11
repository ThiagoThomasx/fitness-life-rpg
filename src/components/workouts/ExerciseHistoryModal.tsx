"use client"

import { useId } from "react"
import type { Exercise } from "@/types/database"
import { getExerciseHistory, getExercisePersonalBest } from "@/lib/workout-history"
import { suggestProgression } from "@/lib/progression"
import { ModalShell } from "@/components/ui/ModalShell"

const HISTORY_LIMIT = 10

type ExerciseHistoryModalProps = {
  exercise: Exercise
  onClose: () => void
}

export function ExerciseHistoryModal({ exercise, onClose }: ExerciseHistoryModalProps) {
  const titleId = useId()
  const history = getExerciseHistory(exercise.id)
  const personalBest = getExercisePersonalBest(exercise.id)
  const suggestion = suggestProgression(exercise.id, null)

  return (
    <ModalShell labelledBy={titleId} variant="sheet" onClose={onClose}>
      <div className="modal-header">
        <div>
          <h3 id={titleId} className="modal-title">{exercise.name}</h3>
          <div className="text-xs text-muted">{exercise.muscle_groups.join(", ")}</div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <div className="mb-5 flex gap-3">
        {personalBest > 0 && (
          <div className="stat-cell flex-1">
            <div className="stat-cell__label">Recorde (PR)</div>
            <div className="stat-cell__value" style={{ color: "var(--color-streak)" }}>
              {personalBest}kg
            </div>
          </div>
        )}
        <div className="stat-cell flex-1" style={{ textAlign: "left" }}>
          <div className="stat-cell__label">Sugestão</div>
          <div className="mt-1 text-xs text-secondary">{suggestion.note}</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">Nenhum registro ainda</p>
          <p className="empty-state__desc">
            Execute este exercício em uma sessão para ver o histórico.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.slice(0, HISTORY_LIMIT).map((record, i) => (
            <div key={i} className="card card--sm">
              <div className="flex flex-wrap gap-2">
                {record.sets.map((set, j) => (
                  <span key={j} className={set.isPr ? "set-chip set-chip--pr" : "set-chip"}>
                    {set.weight_kg > 0 ? `${set.weight_kg}kg × ` : ""}{set.reps}
                    {set.isPr ? " 🏆" : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  )
}
