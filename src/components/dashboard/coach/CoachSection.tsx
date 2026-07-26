"use client"

import { useEffect, useMemo, useState } from "react"
import { runCoachEngine } from "@/lib/coach/engine"
import { recordCoachDecision } from "@/lib/coach/decisions"
import type { CoachDecisionStatus } from "@/lib/coach/decisions"
import type { AnalyticsPeriod } from "@/lib/analytics/types"
import type { CoachPriority, CoachRecommendation } from "@/lib/coach/types"
import { SkeletonCard } from "@/components/ui/Skeleton"
import { PERIOD_OPTIONS } from "@/components/dashboard/analytics/analytics-ui"
import { CoachRecommendationCard } from "./CoachRecommendationCard"
import { PRIORITY_LABELS } from "./coach-ui"

const PRIORITY_GROUPS: CoachPriority[] = ["high", "medium", "low"]

/**
 * Seção Coach dentro do Dashboard — nova seção DENTRO da rota `/dashboard`
 * existente, não uma rota nova (mesma decisão de navegação travada usada
 * pela Analytics Section, Sprint 25 Parte 4B / CLAUDE.md regra 6).
 *
 * `runCoachEngine` lê `localStorage` (via os sinais que compõem os motores
 * de Analytics) — só roda depois de `mounted` para evitar hydration mismatch
 * (mesmo padrão de `AnalyticsSection`). RECÁLCULO: toda montagem/troca de
 * período recalcula do zero (regra "RECÁLCULO" da spec) — só a DECISÃO do
 * usuário sobrevive entre recálculos (`decisionVersion` força um novo
 * `runCoachEngine`, que por sua vez relê as decisões persistidas).
 */
export function CoachSection() {
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const [decisionVersion, setDecisionVersion] = useState(0)
  const [showIgnored, setShowIgnored] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const report = useMemo(
    () => (mounted ? runCoachEngine(period) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decisionVersion é só um trigger de recálculo, não um dado lido pelo engine.
    [mounted, period, decisionVersion]
  )

  function handleDecide(id: string, status: CoachDecisionStatus) {
    recordCoachDecision(id, status)
    setDecisionVersion((v) => v + 1)
  }

  function visibleRecommendations(recs: CoachRecommendation[]): CoachRecommendation[] {
    return showIgnored ? recs : recs.filter((r) => r.status !== "ignorada")
  }

  const groups: Record<CoachPriority, CoachRecommendation[]> = report
    ? { high: report.high, medium: report.medium, low: report.low }
    : { high: [], medium: [], low: [] }

  const totalVisible = PRIORITY_GROUPS.reduce((sum, p) => sum + visibleRecommendations(groups[p]).length, 0)
  const totalIgnored = PRIORITY_GROUPS.reduce((sum, p) => sum + groups[p].filter((r) => r.status === "ignorada").length, 0)

  return (
    <section className="card" aria-labelledby="dashboard-coach-title">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 id="dashboard-coach-title" className="section-label" style={{ marginBottom: 0 }}>
          Coach
        </h2>
        {totalIgnored > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowIgnored((v) => !v)}>
            {showIgnored ? "Ocultar ignoradas" : `Mostrar ignoradas (${totalIgnored})`}
          </button>
        )}
      </div>

      <div
        className="filter-row"
        role="group"
        aria-label="Filtrar Coach por período"
        style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-3)" }}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={period === opt.id ? "filter-pill filter-pill--active" : "filter-pill"}
            aria-pressed={period === opt.id}
            onClick={() => setPeriod(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!report ? (
        <SkeletonCard height="180px" />
      ) : totalVisible === 0 ? (
        <p className="text-xs text-muted">
          Nenhuma recomendação no momento para este período — o Coach volta a analisar a cada vez que o Dashboard é aberto.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {PRIORITY_GROUPS.map((priority) => {
            const items = visibleRecommendations(groups[priority])
            if (items.length === 0) return null
            return (
              <div key={priority}>
                <div className="text-xs font-semibold text-muted" style={{ marginBottom: "var(--space-2)" }}>
                  {PRIORITY_LABELS[priority]}
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((rec) => (
                    <CoachRecommendationCard key={rec.id} recommendation={rec} onDecide={handleDecide} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
