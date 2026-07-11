"use client"

import { formatElapsed } from "@/stores/useSessionStore"

type SessionHeaderProps = {
  workoutName: string
  elapsedSeconds: number
  totalSets: number
  exercisesDone: number
  totalExercises: number
  canFinish: boolean
  onFinish: () => void
  onCancel: () => void
}

export function SessionHeader({
  workoutName,
  elapsedSeconds,
  totalSets,
  exercisesDone,
  totalExercises,
  canFinish,
  onFinish,
  onCancel,
}: SessionHeaderProps) {
  const progressPct = totalExercises > 0 ? (exercisesDone / totalExercises) * 100 : 0

  return (
    <header className="session-header">
      <div className="session-header__top">
        <div className="min-w-0">
          <div className="section-label" style={{ marginBottom: "2px" }}>Sessão ativa</div>
          <h1 className="truncate text-base font-bold text-primary">{workoutName}</h1>
          <div className="session-timer" aria-label={`Tempo de treino: ${formatElapsed(elapsedSeconds)}`}>
            {formatElapsed(elapsedSeconds)}
          </div>
        </div>
        <div className="session-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={onFinish} disabled={!canFinish}>
            Finalizar
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="numeric text-secondary">
            {exercisesDone}/{totalExercises} exercício{totalExercises !== 1 ? "s" : ""} com séries
          </span>
          <span className="numeric text-secondary">
            {totalSets} série{totalSets !== 1 ? "s" : ""} registrada{totalSets !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={exercisesDone}
          aria-valuemin={0}
          aria-valuemax={totalExercises}
          aria-label="Progresso da sessão por exercício"
        >
          <div className="progress-fill progress-fill--accent" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </header>
  )
}
