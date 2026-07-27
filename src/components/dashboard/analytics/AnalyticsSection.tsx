"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { buildDashboardAnalytics } from "@/lib/analytics/dashboard"
import type { AnalyticsPeriod } from "@/lib/analytics/types"
import { SkeletonCard } from "@/components/ui/Skeleton"
import { PERIOD_OPTIONS } from "./analytics-ui"
import { ConsistencyPanel } from "./ConsistencyPanel"
import { FatiguePanel } from "./FatiguePanel"
import { HighlightsPanel } from "./HighlightsPanel"
import { InsightsPanel } from "./InsightsPanel"

// PerformancePanel e MuscleBalancePanel são os únicos painéis desta seção que
// importam recharts (~85-90kB gzip). Carregados só sob demanda para não
// pesar o First Load JS de /dashboard, cuja aba padrão é "highlights".
const PerformancePanel = dynamic(() => import("./PerformancePanel").then((m) => m.PerformancePanel), {
  ssr: false,
  loading: () => <SkeletonCard height="220px" />,
})
const MuscleBalancePanel = dynamic(() => import("./MuscleBalancePanel").then((m) => m.MuscleBalancePanel), {
  ssr: false,
  loading: () => <SkeletonCard height="220px" />,
})

type SubTab = "highlights" | "performance" | "consistency" | "muscle" | "fatigue" | "insights"

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "highlights", label: "Destaques" },
  { id: "performance", label: "Performance" },
  { id: "consistency", label: "Consistência" },
  { id: "muscle", label: "Músculos" },
  { id: "fatigue", label: "Recuperação" },
  { id: "insights", label: "Insights" },
]

/**
 * Seção de Dashboard Analytics (Sprint 25 Parte 4B) — nova seção DENTRO da
 * rota `/dashboard` existente, não uma rota nova nem item de navegação novo
 * (decisão de navegação travada no Sprint 1, CLAUDE.md regra 6). O filtro de
 * sub-seção reaproveita o mesmo padrão de `.filter-pill` já usado para
 * filtro de período em `ExerciseChartsSection`, aplicado aqui a um segundo
 * eixo (qual painel mostrar) em vez de introduzir um componente de tabs novo.
 *
 * `buildDashboardAnalytics` lê `localStorage` diretamente (via os motores de
 * `lib/analytics/*`) — computá-lo durante o render do primeiro paint no
 * servidor causaria hydration mismatch (SSR não tem `localStorage`). Por
 * isso o cálculo só acontece depois de `mounted` (mesmo padrão de
 * `characterHydrated`/`loaded` já usado em `dashboard/page.tsx`), com
 * skeleton no meio tempo.
 */
export function AnalyticsSection() {
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const [activeTab, setActiveTab] = useState<SubTab>("highlights")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Chaveado só por `period`: `buildDashboardAnalytics` é uma função pura
  // sem memoização interna (ver cabeçalho de `dashboard.ts`) — recalcular a
  // cada troca de período é o custo esperado; não há um sinal de "versão do
  // histórico" no resto do app para invalidar cache entre trocas de treino
  // dentro da mesma sessão de página, e criar um seria over-engineering
  // (YAGNI) para esta sprint.
  const analytics = useMemo(() => (mounted ? buildDashboardAnalytics(period) : null), [mounted, period])

  return (
    <section className="card" aria-labelledby="dashboard-analytics-title">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 id="dashboard-analytics-title" className="section-label" style={{ marginBottom: 0 }}>
          Analytics
        </h2>
      </div>

      <div
        className="filter-row"
        role="group"
        aria-label="Filtrar Analytics por período"
        style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}
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

      <div
        className="filter-row"
        role="tablist"
        aria-label="Seções de Analytics"
        style={{ marginBottom: "var(--space-3)" }}
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "filter-pill filter-pill--active" : "filter-pill"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!analytics ? (
        <SkeletonCard height="220px" />
      ) : (
        <div role="tabpanel">
          {activeTab === "highlights" && (
            <HighlightsPanel
              progress={analytics.progress}
              stagnant={analytics.performance.stagnant}
              bestMonth={analytics.consistency.bestMonth}
            />
          )}
          {activeTab === "performance" && <PerformancePanel performance={analytics.performance} />}
          {activeTab === "consistency" && <ConsistencyPanel consistency={analytics.consistency} />}
          {activeTab === "muscle" && <MuscleBalancePanel muscleBalance={analytics.muscleBalance} />}
          {activeTab === "fatigue" && <FatiguePanel fatigue={analytics.fatigue} />}
          {activeTab === "insights" && <InsightsPanel insights={analytics.insights} />}
        </div>
      )}
    </section>
  )
}
