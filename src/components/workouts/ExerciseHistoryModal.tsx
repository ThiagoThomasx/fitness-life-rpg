"use client"

import { useId } from "react"
import type { Exercise } from "@/types/database"
import { getExerciseHistory, getExercisePersonalBest } from "@/lib/workout-history"
import { suggestProgression } from "@/lib/progression"
import { getExerciseSummary } from "@/lib/exercise-records"
import { ModalShell } from "@/components/ui/ModalShell"

const HISTORY_LIMIT = 10

const TREND_ICON: Record<string, string> = {
  up: "⬆",
  down: "⬇",
  flat: "→",
  insufficient_data: "—",
}

const RECORD_BADGES: Array<{ key: "isFirstTime" | "isWeightPr" | "isVolumePr" | "isRepsPr"; icon: string; label: string }> = [
  { key: "isFirstTime", icon: "🆕", label: "Estreia" },
  { key: "isWeightPr", icon: "🥇", label: "PR de peso" },
  { key: "isVolumePr", icon: "📦", label: "PR de volume" },
  { key: "isRepsPr", icon: "🔁", label: "PR de reps" },
]

type ExerciseHistoryModalProps = {
  exercise: Exercise
  onClose: () => void
}

export function ExerciseHistoryModal({ exercise, onClose }: ExerciseHistoryModalProps) {
  const titleId = useId()
  const history = getExerciseHistory(exercise.id)
  const personalBest = getExercisePersonalBest(exercise.id)
  const suggestion = suggestProgression(exercise.id, null)
  const summary = getExerciseSummary(exercise.id)

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

      <div className="mb-5 flex flex-wrap gap-3">
        {personalBest > 0 && (
          <div className="stat-cell flex-1">
            <div className="stat-cell__label">Recorde (PR)</div>
            <div className="stat-cell__value" style={{ color: "var(--color-streak)" }}>
              {personalBest}kg
            </div>
          </div>
        )}
        {summary && summary.bestVolumeKg > 0 && (
          <div className="stat-cell flex-1">
            <div className="stat-cell__label">Melhor volume</div>
            <div className="stat-cell__value">{summary.bestVolumeKg}kg</div>
          </div>
        )}
        {summary?.bestEstimated1RMKg != null && (
          <div className="stat-cell flex-1">
            <div className="stat-cell__label">1RM estimado</div>
            <div className="stat-cell__value">{Math.round(summary.bestEstimated1RMKg)}kg</div>
          </div>
        )}
        {summary && summary.trend !== "insufficient_data" && (
          <div className="stat-cell flex-1">
            <div className="stat-cell__label">Tendência</div>
            <div className="stat-cell__value">{TREND_ICON[summary.trend]}</div>
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
          {history.slice(0, HISTORY_LIMIT).map((record, i) => {
            const badges = RECORD_BADGES.filter((b) => record[b.key])
            return (
              <div key={i} className="card card--sm">
                {badges.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {badges.map((b) => (
                      <span key={b.key} className="badge-pill badge-pill--streak" title={b.label}>
                        {b.icon} {b.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {record.sets.map((set, j) => (
                    <span key={j} className={set.isPr ? "set-chip set-chip--pr" : "set-chip"}>
                      {set.weight_kg > 0 ? `${set.weight_kg}kg × ` : ""}{set.reps}
                      {set.isPr ? " 🏆" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ModalShell>
  )
}
