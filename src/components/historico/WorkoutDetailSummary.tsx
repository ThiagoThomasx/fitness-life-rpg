"use client"

import type { CompletedWorkout } from "@/lib/workout-history"

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h${rest}min` : `${hours}h`
}

type WorkoutDetailSummaryProps = {
  workout: CompletedWorkout
  volumeKg: number
  totalSets: number
  totalReps: number
  recordCount: number
}

/**
 * Resumo executivo da sessão (Sprint 22 Parte 3A §3): tempo, volume, séries,
 * repetições, exercícios, XP e recompensas — mesmo padrão `stat-grid` de
 * `/exercicios/[id]`.
 */
export function WorkoutDetailSummary({ workout, volumeKg, totalSets, totalReps, recordCount }: WorkoutDetailSummaryProps) {
  return (
    <section className="card" aria-labelledby="workout-summary-title">
      <h2 id="workout-summary-title" className="section-label">Resumo</h2>

      <div className="stat-grid stat-grid--3" style={{ marginTop: "var(--space-2)" }}>
        <div className="stat-cell">
          <div className="stat-cell__label">Tempo</div>
          <div className="stat-cell__value">{formatDuration(workout.durationSeconds)}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__label">Exercícios</div>
          <div className="stat-cell__value">{workout.exercises.length}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__label">Séries</div>
          <div className="stat-cell__value">{totalSets}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__label">Repetições</div>
          <div className="stat-cell__value">{totalReps}</div>
        </div>
        {volumeKg > 0 && (
          <div className="stat-cell">
            <div className="stat-cell__label">Carga (volume)</div>
            <div className="stat-cell__value">{Math.round(volumeKg)}kg</div>
          </div>
        )}
        <div className="stat-cell">
          <div className="stat-cell__label">XP</div>
          <div className="stat-cell__value">{Math.floor(workout.xpEarned)}</div>
        </div>
        {recordCount > 0 && (
          <div className="stat-cell">
            <div className="stat-cell__label">Recompensas</div>
            <div className="stat-cell__value">🏆 {recordCount} recorde{recordCount !== 1 ? "s" : ""}</div>
          </div>
        )}
      </div>
    </section>
  )
}
