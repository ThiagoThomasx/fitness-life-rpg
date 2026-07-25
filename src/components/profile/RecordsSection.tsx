"use client"

import Link from "next/link"
import type { ProfileRecordStats } from "@/lib/exercise-records"

type Props = {
  stats: ProfileRecordStats
}

function StatCell({ value, label, exerciseId }: { value: string; label: string; exerciseId: string | null }) {
  if (!exerciseId) {
    return (
      <div className="stat-cell">
        <div className="stat-cell__value numeric">{value}</div>
        <div className="stat-cell__label">{label}</div>
      </div>
    )
  }
  return (
    <Link href={`/exercicios/${exerciseId}`} className="stat-cell" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="stat-cell__value numeric">{value}</div>
      <div className="stat-cell__label">{label}</div>
    </Link>
  )
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
      <StatCell
        value={`${stats.heaviestWeightEverKg}kg`}
        label={stats.heaviestWeightExerciseName ? `Maior carga (${stats.heaviestWeightExerciseName})` : "Maior carga"}
        exerciseId={stats.heaviestWeightExerciseId}
      />
      <StatCell
        value={stats.mostImprovedExercise ? `+${stats.mostImprovedExercise.deltaKg}kg` : "—"}
        label={stats.mostImprovedExercise ? `Maior evolução (${stats.mostImprovedExercise.exerciseName})` : "Maior evolução"}
        exerciseId={stats.mostImprovedExercise?.exerciseId ?? null}
      />
      <div className="stat-cell">
        <div className="stat-cell__value numeric">{stats.longestImprovementStreak}</div>
        <div className="stat-cell__label">Sequência de melhorias</div>
      </div>
    </div>
  )
}
