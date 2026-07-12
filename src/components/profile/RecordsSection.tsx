"use client"

import type { ProfileRecordStats } from "@/lib/exercise-records"

type Props = {
  stats: ProfileRecordStats
}

export function RecordsSection({ stats }: Props) {
  if (stats.totalRecords === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">🏆</div>
        <p className="empty-state__desc">Ainda sem histórico suficiente.</p>
      </div>
    )
  }

  return (
    <div className="stat-grid stat-grid--2">
      <div className="stat-cell">
        <div className="stat-cell__value numeric">{stats.totalRecords}</div>
        <div className="stat-cell__label">Total de recordes</div>
      </div>
      <div className="stat-cell">
        <div className="stat-cell__value numeric">{stats.heaviestWeightEverKg}kg</div>
        <div className="stat-cell__label">
          {stats.heaviestWeightExerciseName ? `Maior carga (${stats.heaviestWeightExerciseName})` : "Maior carga"}
        </div>
      </div>
      <div className="stat-cell">
        <div className="stat-cell__value numeric">
          {stats.mostImprovedExercise ? `+${stats.mostImprovedExercise.deltaKg}kg` : "—"}
        </div>
        <div className="stat-cell__label">
          {stats.mostImprovedExercise ? `Maior evolução (${stats.mostImprovedExercise.exerciseName})` : "Maior evolução"}
        </div>
      </div>
      <div className="stat-cell">
        <div className="stat-cell__value numeric">{stats.longestImprovementStreak}</div>
        <div className="stat-cell__label">Sequência de melhorias</div>
      </div>
    </div>
  )
}
