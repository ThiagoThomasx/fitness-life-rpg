"use client"

import type { ReadinessStats } from "@/lib/workout-readiness"
import type { WorkoutReadinessCheckIn } from "@/lib/readiness-check-ins"
import type { AdjustmentHistoryStats } from "@/lib/session-adjustments"

function levelLabel(high: number, moderate: number, low: number): string {
  if (high > moderate && high > low) return "alta"
  if (moderate >= high && moderate >= low) return "moderada"
  if (low > high && low > moderate) return "baixa"
  return "moderada"
}

interface Props {
  stats: ReadinessStats
  lastCheckIn: WorkoutReadinessCheckIn | null
  adjustmentStats?: AdjustmentHistoryStats | null
}

export function ReadinessOverviewCard({ stats, lastCheckIn, adjustmentStats }: Props) {
  if (stats.totalCheckIns === 0) {
    return (
      <div className="card">
        <h3 className="card__title">Recuperação recente</h3>
        <p className="text-muted text-sm mt-2">
          Faça seu primeiro check-in antes de um treino para ver dados de recuperação aqui.
        </p>
      </div>
    )
  }

  const avgLabel = levelLabel(
    stats.highReadinessCount,
    stats.moderateReadinessCount,
    stats.lowReadinessCount
  )
  const aligned = stats.highReadinessCount + stats.moderateReadinessCount

  return (
    <div className="card">
      <h3 className="card__title">Recuperação recente</h3>
      <p className="text-muted text-sm mt-1">
        Prontidão média: <strong>{avgLabel}</strong>
      </p>

      <div className="stat-grid stat-grid--3 mt-3">
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{stats.highReadinessCount}</div>
          <div className="stat-cell__label">Alta</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{stats.moderateReadinessCount}</div>
          <div className="stat-cell__label">Moderada</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{stats.lowReadinessCount}</div>
          <div className="stat-cell__label">Baixa</div>
        </div>
      </div>

      {aligned > 0 && (
        <p className="text-sm mt-3 text-muted">
          {aligned} sessão{aligned !== 1 ? "ões" : ""} alinhada{aligned !== 1 ? "s" : ""}
          {stats.lowReadinessCount > 0
            ? ` · ${stats.lowReadinessCount} com prontidão baixa`
            : ""}
        </p>
      )}

      {lastCheckIn && (
        <p className="text-xs text-muted mt-2">
          Último check-in: energia {lastCheckIn.energy}/5 · sono {lastCheckIn.sleepQuality}/5
          {lastCheckIn.stress !== undefined && ` · estresse ${lastCheckIn.stress}/5`}
          {lastCheckIn.mood !== undefined && ` · humor ${lastCheckIn.mood}/5`}
        </p>
      )}

      {adjustmentStats && adjustmentStats.totalSessions > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted">Estratégias recentes</p>
          <p className="text-sm mt-1">
            {adjustmentStats.conservativeSessions > 0 && (
              <span>{adjustmentStats.conservativeSessions} sessão{adjustmentStats.conservativeSessions !== 1 ? "ões" : ""} no modo conservador · </span>
            )}
            <span>{adjustmentStats.originalSessions} no plano original</span>
          </p>
        </div>
      )}
    </div>
  )
}
