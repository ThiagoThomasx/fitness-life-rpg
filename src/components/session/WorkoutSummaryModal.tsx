"use client"

import { useId } from "react"
import type { XpGainResult } from "@/stores/useCharacterStore"
import { formatElapsed } from "@/stores/useSessionStore"
import { ModalShell } from "@/components/ui/ModalShell"

type WorkoutSummaryModalProps = {
  result: XpGainResult
  durationSeconds: number
  totalExercises: number
  totalSets: number
  isProcessing: boolean
  onConfirm: (destination: "/dashboard" | "/treinos") => void
}

export function WorkoutSummaryModal({
  result,
  durationSeconds,
  totalExercises,
  totalSets,
  isProcessing,
  onConfirm,
}: WorkoutSummaryModalProps) {
  const titleId = useId()
  const icon = result.level_up ? "🎉" : result.prsCount > 0 ? "🏆" : "⚡"

  return (
    <ModalShell labelledBy={titleId} dismissible={false}>
      <div className="text-center">
        <div className="text-5xl" aria-hidden="true">{icon}</div>
        <h2 id={titleId} className="display-heading mt-3 text-2xl">Treino concluído!</h2>

        <div className="stat-grid stat-grid--3 mt-4">
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{formatElapsed(durationSeconds)}</div>
            <div className="stat-cell__label">Duração</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{totalExercises}</div>
            <div className="stat-cell__label">Exercícios</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{totalSets}</div>
            <div className="stat-cell__label">Séries</div>
          </div>
        </div>

        {result.level_up && (
          <div className="summary-callout" role="status">
            🏅 Level up! {result.old_level} → {result.new_level}
          </div>
        )}

        {result.prsCount > 0 && (
          <div className="summary-callout" role="status">
            🎯 {result.prsCount} recorde{result.prsCount > 1 ? "s" : ""} pessoal{result.prsCount > 1 ? "is" : ""}!
          </div>
        )}

        <div className="summary-xp">
          <div className="summary-xp__value">+{result.xp_earned} XP</div>
          <div className="summary-breakdown">
            {result.breakdown.map((item) => (
              <div key={item.label} className="summary-breakdown__row">
                <span>{item.label}</span>
                <span className="summary-breakdown__amount">+{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={isProcessing ? "btn btn--primary btn--full btn--lg btn--loading" : "btn btn--primary btn--full btn--lg"}
            onClick={() => onConfirm("/dashboard")}
            disabled={isProcessing}
          >
            Voltar ao Dashboard
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--full"
            onClick={() => onConfirm("/treinos")}
            disabled={isProcessing}
          >
            Ir para Treinos
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
