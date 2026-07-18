"use client"

import { useEffect, useState } from "react"
import { getCompletedCycles, getArchivedCycles, TRAINING_CYCLE_GOAL_LABELS, type TrainingCycle, type TrainingCycleGoal } from "@/lib/training-cycles"
import { buildCycleSummary } from "@/lib/training-cycle-summary"
import { getReviewsByCycle } from "@/lib/training-cycle-reviews"
import { buildCycleReviewAnalytics } from "@/lib/training-cycle-review-analytics"
import { countWeeksByType, buildCycleWeekBreakdown } from "@/lib/training-cycle-week-summary"

interface CycleProfileStats {
  completedCount: number
  archivedCount: number
  averageDurationWeeks: number
  averageSessionsPerCycle: number
  averageWeeklyVolumeKg: number
  averageAdherencePct: number | null
  cycleWithMostPrs: string | null
  recoveryWeeks: number
  averageSatisfaction: number | null
  mostUsedGoalLabel: string | null
}

function buildStats(completed: TrainingCycle[], archived: TrainingCycle[]): CycleProfileStats | null {
  if (completed.length === 0 && archived.length === 0) return null

  const allCycles = [...completed, ...archived]
  const summaries = allCycles.map((c) => ({ cycle: c, summary: buildCycleSummary(c) }))

  const adherenceValues = summaries
    .filter(({ summary }) => summary.totalSessions > 0)
    .map(({ summary }) => (summary.plannedSessions / summary.totalSessions) * 100)

  const satisfactionValues = allCycles
    .flatMap((c) => buildCycleReviewAnalytics(getReviewsByCycle(c.id)).averageSatisfaction)
    .filter((v): v is number => v !== null)

  const mostPrs = summaries.reduce<{ name: string; prs: number } | null>((best, { cycle, summary }) => {
    if (!best || summary.totalPrs > best.prs) return { name: cycle.name, prs: summary.totalPrs }
    return best
  }, null)

  const goalCounts = new Map<TrainingCycleGoal, number>()
  for (const c of allCycles) goalCounts.set(c.goal, (goalCounts.get(c.goal) ?? 0) + 1)
  let mostUsedGoal: TrainingCycleGoal | null = null
  let mostUsedCount = 0
  for (const [goal, count] of Array.from(goalCounts.entries())) {
    if (count > mostUsedCount) {
      mostUsedGoal = goal
      mostUsedCount = count
    }
  }

  const recoveryWeeks = allCycles.reduce(
    (sum, c) => sum + countWeeksByType(buildCycleWeekBreakdown(c)).recovery,
    0
  )

  return {
    completedCount: completed.length,
    archivedCount: archived.length,
    averageDurationWeeks: summaries.length > 0
      ? Math.round((summaries.reduce((sum, { summary }) => sum + summary.completedWeeks, 0) / summaries.length) * 10) / 10
      : 0,
    averageSessionsPerCycle: summaries.length > 0
      ? Math.round(summaries.reduce((sum, { summary }) => sum + summary.totalSessions, 0) / summaries.length)
      : 0,
    averageWeeklyVolumeKg: summaries.length > 0
      ? Math.round(summaries.reduce((sum, { summary }) => sum + summary.averageWeeklyVolumeKg, 0) / summaries.length)
      : 0,
    averageAdherencePct: adherenceValues.length > 0
      ? Math.round(adherenceValues.reduce((sum, v) => sum + v, 0) / adherenceValues.length)
      : null,
    cycleWithMostPrs: mostPrs && mostPrs.prs > 0 ? mostPrs.name : null,
    recoveryWeeks,
    averageSatisfaction: satisfactionValues.length > 0
      ? Math.round((satisfactionValues.reduce((sum, v) => sum + v, 0) / satisfactionValues.length) * 10) / 10
      : null,
    mostUsedGoalLabel: mostUsedGoal ? TRAINING_CYCLE_GOAL_LABELS[mostUsedGoal] : null,
  }
}

export function CycleStatsSection() {
  const [stats, setStats] = useState<CycleProfileStats | null>(null)

  useEffect(() => {
    setStats(buildStats(getCompletedCycles(), getArchivedCycles()))
  }, [])

  if (!stats) return null

  return (
    <section aria-labelledby="perfil-ciclos">
      <div className="section-header">
        <h2 id="perfil-ciclos" className="section-header__title">Ciclos de treino</h2>
      </div>
      <div className="card">
        <div className="stat-grid stat-grid--3 mb-3">
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{stats.completedCount}</div>
            <div className="stat-cell__label">Concluídos</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{stats.archivedCount}</div>
            <div className="stat-cell__label">Arquivados</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{stats.averageDurationWeeks}</div>
            <div className="stat-cell__label">Duração média (sem)</div>
          </div>
        </div>
        <div className="stat-grid stat-grid--3">
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{stats.averageSessionsPerCycle}</div>
            <div className="stat-cell__label">Sessões médias</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{stats.averageWeeklyVolumeKg.toLocaleString("pt-BR")}</div>
            <div className="stat-cell__label">Vol. médio/sem (kg)</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{stats.averageAdherencePct !== null ? `${stats.averageAdherencePct}%` : "—"}</div>
            <div className="stat-cell__label">Aderência média</div>
          </div>
        </div>

        <div style={{ marginTop: "0.875rem", paddingTop: "0.875rem", borderTop: "1px solid var(--color-border-subtle)", fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
          {stats.cycleWithMostPrs && <div>Mais PRs: {stats.cycleWithMostPrs}</div>}
          <div>Semanas de recuperação: {stats.recoveryWeeks}</div>
          {stats.averageSatisfaction !== null && <div>Satisfação média: {stats.averageSatisfaction.toFixed(1)}</div>}
          {stats.mostUsedGoalLabel && <div>Objetivo mais usado: {stats.mostUsedGoalLabel}</div>}
        </div>
      </div>
    </section>
  )
}
