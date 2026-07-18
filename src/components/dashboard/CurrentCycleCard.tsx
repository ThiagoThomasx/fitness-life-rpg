"use client"

import { useEffect, useState } from "react"
import { getActiveCycle, TRAINING_CYCLE_GOAL_LABELS, type TrainingCycle } from "@/lib/training-cycles"
import { buildCycleSummary, type TrainingCycleSummary, type CycleTrend } from "@/lib/training-cycle-summary"
import { getReviewsByCycle, isMidCycleReviewAvailable } from "@/lib/training-cycle-reviews"
import { buildCycleReviewAnalytics } from "@/lib/training-cycle-review-analytics"
import { buildCycleWeekBreakdown } from "@/lib/training-cycle-week-summary"
import { CYCLE_WEEK_TYPE_LABELS } from "@/lib/training-cycle-weeks"

const TREND_LABELS: Record<CycleTrend, string> = {
  increasing: "Volume crescendo",
  stable: "Volume estável",
  decreasing: "Volume reduzindo",
  mixed: "Volume oscilando",
  insufficient_data: "Dados insuficientes ainda",
}

export function CurrentCycleCard() {
  const [cycle, setCycle] = useState<TrainingCycle | null>(null)
  const [summary, setSummary] = useState<TrainingCycleSummary | null>(null)
  const [midCycleReviewDue, setMidCycleReviewDue] = useState(false)
  const [lastReviewAt, setLastReviewAt] = useState<string | null>(null)
  const [currentWeekType, setCurrentWeekType] = useState<string | null>(null)

  useEffect(() => {
    const active = getActiveCycle()
    setCycle(active)
    if (!active) return

    const cycleSummary = buildCycleSummary(active)
    setSummary(cycleSummary)

    const reviews = getReviewsByCycle(active.id)
    setMidCycleReviewDue(isMidCycleReviewAvailable(active.plannedWeeks, cycleSummary.completedWeeks, reviews))
    const analytics = buildCycleReviewAnalytics(reviews)
    setLastReviewAt(analytics.lastReview?.createdAt ?? null)

    const weeks = buildCycleWeekBreakdown(active)
    setCurrentWeekType(weeks.length > 0 ? weeks[weeks.length - 1].type : null)
  }, [])

  if (!cycle || !summary) {
    return (
      <section className="card card--sm" aria-label="Ciclo atual">
        <div className="section-label" style={{ marginBottom: 6 }}>Ciclo atual</div>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Nenhum ciclo ativo</p>
      </section>
    )
  }

  const goalLabel = cycle.goal === "custom" ? cycle.customGoal || "Personalizado" : TRAINING_CYCLE_GOAL_LABELS[cycle.goal]
  const weekLabel = summary.plannedWeeks
    ? `Semana ${Math.min(summary.completedWeeks, summary.plannedWeeks)} de ${summary.plannedWeeks}`
    : `Semana ${summary.completedWeeks}`

  return (
    <section className="card card--sm" aria-label="Ciclo atual">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 2 }}>Ciclo atual</div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>{cycle.name}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>{goalLabel}</div>
        </div>
        {midCycleReviewDue && (
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-accent)" }}>Revisão disponível</span>
        )}
      </div>

      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 8 }}>
        {weekLabel}
        {currentWeekType && currentWeekType !== "normal" && ` · ${CYCLE_WEEK_TYPE_LABELS[currentWeekType as keyof typeof CYCLE_WEEK_TYPE_LABELS]}`}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: 8, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
        <span>{summary.totalSessions} sessões</span>
        <span>{summary.totalPrs} PRs</span>
      </div>

      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 6 }}>
        {TREND_LABELS[summary.trend]}
        {lastReviewAt && ` · Última revisão em ${lastReviewAt.slice(0, 10)}`}
      </div>
    </section>
  )
}
