"use client"

import { useEffect, useState } from "react"
import { getActiveCycle, getCompletedCycles, type TrainingCycle } from "@/lib/training-cycles"
import { buildCycleSummary } from "@/lib/training-cycle-summary"
import { getReviewsByCycle } from "@/lib/training-cycle-reviews"
import { countWeeksByType, buildCycleWeekBreakdown } from "@/lib/training-cycle-week-summary"
import { CycleComparisonSection } from "@/components/plano/CycleComparisonSection"

interface CycleEvolutionStats {
  completedCount: number
  averageDurationWeeks: number
  averageWeeklyVolumeKg: number
  averageAdherencePct: number | null
  totalPrs: number
  averageReadiness: number | null
  totalReviews: number
  recoveryWeeks: number
}

function buildStats(completed: TrainingCycle[]): CycleEvolutionStats {
  const summaries = completed.map((c) => buildCycleSummary(c))
  const reviewCounts = completed.map((c) => getReviewsByCycle(c.id).length)
  const recoveryWeeks = completed.reduce(
    (sum, c) => sum + countWeeksByType(buildCycleWeekBreakdown(c)).recovery,
    0
  )

  const readinessValues = summaries.map((s) => s.averageReadiness).filter((v): v is number => v !== null)
  const adherenceValues = summaries
    .filter((s) => s.totalSessions > 0)
    .map((s) => (s.plannedSessions / s.totalSessions) * 100)

  return {
    completedCount: completed.length,
    averageDurationWeeks: summaries.length > 0
      ? Math.round((summaries.reduce((sum, s) => sum + s.completedWeeks, 0) / summaries.length) * 10) / 10
      : 0,
    averageWeeklyVolumeKg: summaries.length > 0
      ? Math.round(summaries.reduce((sum, s) => sum + s.averageWeeklyVolumeKg, 0) / summaries.length)
      : 0,
    averageAdherencePct: adherenceValues.length > 0
      ? Math.round(adherenceValues.reduce((sum, v) => sum + v, 0) / adherenceValues.length)
      : null,
    totalPrs: summaries.reduce((sum, s) => sum + s.totalPrs, 0),
    averageReadiness: readinessValues.length > 0
      ? Math.round((readinessValues.reduce((sum, v) => sum + v, 0) / readinessValues.length) * 10) / 10
      : null,
    totalReviews: reviewCounts.reduce((sum, n) => sum + n, 0),
    recoveryWeeks,
  }
}

export function CycleEvolutionSection() {
  const [activeCycle, setActiveCycle] = useState<TrainingCycle | null>(null)
  const [completedCycles, setCompletedCycles] = useState<TrainingCycle[]>([])
  const [stats, setStats] = useState<CycleEvolutionStats | null>(null)

  useEffect(() => {
    const completed = getCompletedCycles()
    setActiveCycle(getActiveCycle())
    setCompletedCycles(completed)
    setStats(buildStats(completed))
  }, [])

  if (!stats) return null

  if (stats.completedCount === 0 && !activeCycle) return null

  return (
    <section>
      <h2 className="section-label" style={{ marginBottom: "0.75rem" }}>Evolução por ciclo</h2>

      <div className="card">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
          <span>{activeCycle ? `Ciclo ativo: ${activeCycle.name}` : "Nenhum ciclo ativo"}</span>
        </div>

        {stats.completedCount > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem",
            marginTop: "0.875rem", paddingTop: "0.875rem", borderTop: "1px solid var(--color-border-subtle)",
          }}>
            <Stat label="Ciclos concluídos" value={String(stats.completedCount)} />
            <Stat label="Duração média" value={`${stats.averageDurationWeeks} sem`} />
            <Stat label="Vol. médio/sem" value={`${stats.averageWeeklyVolumeKg.toLocaleString("pt-BR")} kg`} />
            <Stat label="Aderência média" value={stats.averageAdherencePct !== null ? `${stats.averageAdherencePct}%` : "—"} />
            <Stat label="PRs no total" value={String(stats.totalPrs)} />
            <Stat label="Prontidão média" value={stats.averageReadiness !== null ? stats.averageReadiness.toFixed(1) : "—"} />
            <Stat label="Revisões registradas" value={String(stats.totalReviews)} />
            <Stat label="Semanas de recuperação" value={String(stats.recoveryWeeks)} />
          </div>
        )}
      </div>

      {stats.completedCount >= 2 && (
        <div style={{ marginTop: "0.75rem" }}>
          <CycleComparisonSection completedCycles={completedCycles} />
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
    </div>
  )
}
