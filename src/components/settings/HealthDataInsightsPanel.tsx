"use client"

import { useEffect, useMemo, useState } from "react"
import {
  METRIC_LABELS,
  METRIC_UNITS,
  getConflicts,
  getLatestSummary,
  getMetricBaseline,
  getMetricTrend,
  getMinimumBaselineSamples,
  summaryMetricValue,
  HEALTH_METRIC_TYPES,
  type DailyHealthSummary,
  type HealthConflictSeverity,
  type HealthDataQualityLevel,
  type HealthDataRecord,
  type HealthMetricType,
} from "@/lib/health-data"
import { PERIOD_OPTIONS } from "@/components/dashboard/analytics/analytics-ui"
import { SkeletonCard } from "@/components/ui/Skeleton"
import type { AnalyticsPeriod } from "@/lib/analytics/types"

const QUALITY_LABELS: Record<HealthDataQualityLevel, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  unknown: "Desconhecida",
}

const SEVERITY_LABELS: Record<HealthConflictSeverity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}

function qualityBadgeClass(level: HealthDataQualityLevel): string {
  if (level === "high") return "health-quality-badge health-quality-badge--high"
  if (level === "low") return "health-quality-badge health-quality-badge--low"
  return "health-quality-badge"
}

function formatDate(dateOnly: string): string {
  const date = new Date(`${dateOnly}T12:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? dateOnly : date.toLocaleDateString("pt-BR")
}

function formatValue(value: number, metric: HealthMetricType): string {
  return `${Math.round(value * 10) / 10} ${METRIC_UNITS[metric]}`
}

interface SummaryField {
  metric: HealthMetricType
  value: number
}

function summaryFields(summary: DailyHealthSummary): SummaryField[] {
  return HEALTH_METRIC_TYPES.map((metric) => ({ metric, value: summaryMetricValue(summary, metric) })).filter(
    (f): f is SummaryField => f.value !== undefined
  )
}

type Props = {
  records: HealthDataRecord[]
}

/**
 * Camada analítica mínima da Sprint 28 Parte 3 — mostra o resumo diário,
 * conflitos, qualidade, baseline e tendência já calculados por
 * `analytics-queries.ts`. Fica dentro da área "Dados de saúde" existente, não
 * um dashboard novo (ver seção 18 do prompt da sprint). `records` só é usado
 * como gatilho de recálculo: cada `load()` do componente pai cria um array
 * novo, então esse `useMemo` refaz as consultas sempre que algo muda.
 */
export function HealthDataInsightsPanel({ records }: Props) {
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const [metric, setMetric] = useState<HealthMetricType>("steps")
  const [conflictsExpanded, setConflictsExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // `records` não é lido dentro dos callbacks — as consultas leem o
  // `localStorage` diretamente — mas sua identidade muda a cada `load()` do
  // componente pai, então incluí-lo como dependência é o gatilho de
  // recálculo depois de um registro novo ser salvo/importado/excluído.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const latestSummary = useMemo(() => (mounted ? getLatestSummary() : null), [mounted, records])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const conflicts = useMemo(() => (mounted ? getConflicts(period) : []), [mounted, period, records])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const baseline = useMemo(() => (mounted ? getMetricBaseline(metric, period) : null), [mounted, period, metric, records])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trend = useMemo(() => (mounted ? getMetricTrend(metric, period) : null), [mounted, period, metric, records])

  if (!mounted) return <SkeletonCard height="220px" />

  return (
    <section className="card" aria-labelledby="health-insights-title">
      <h3 id="health-insights-title" className="section-label settings-section__title">
        Análise de dados de saúde
      </h3>

      <div
        className="filter-row"
        role="group"
        aria-label="Filtrar análise por período"
        style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-3)" }}
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

      <div>
        <p className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
          Resumo mais recente
        </p>
        {!latestSummary ? (
          <p className="settings-section__body">Nenhum registro de saúde ainda.</p>
        ) : (
          <>
            <p className="settings-section__body">
              {formatDate(latestSummary.date)} · qualidade:{" "}
              <span className={qualityBadgeClass(latestSummary.quality.level)}>{QUALITY_LABELS[latestSummary.quality.level]}</span>
            </p>
            <p className="settings-section__body" style={{ fontSize: "var(--text-xs)" }}>
              {summaryFields(latestSummary)
                .map((f) => `${METRIC_LABELS[f.metric]}: ${formatValue(f.value, f.metric)}`)
                .join(" · ")}
            </p>
            <p className="settings-section__body" style={{ fontSize: "var(--text-xs)" }}>
              {latestSummary.quality.reasons.join("; ")}
            </p>
          </>
        )}
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <button
          type="button"
          className="btn btn--ghost btn--full"
          aria-expanded={conflictsExpanded}
          onClick={() => setConflictsExpanded((v) => !v)}
          disabled={conflicts.length === 0}
        >
          {conflicts.length} conflito(s) encontrado(s) no período
        </button>
        {conflictsExpanded && conflicts.length > 0 && (
          <ul className="health-import-list" aria-label="Conflitos entre fontes">
            {conflicts.map((c) => (
              <li key={`${c.metric}-${c.date}`} className="health-import-list__row">
                <span>
                  {METRIC_LABELS[c.metric]} — {formatDate(c.date)}
                </span>
                <span className="health-import-list__reason">
                  {c.reason} · severidade: {SEVERITY_LABELS[c.severity]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <label htmlFor="health-insights-metric" className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
          Métrica para linha de base e tendência
        </label>
        <select
          id="health-insights-metric"
          className="input"
          value={metric}
          onChange={(e) => setMetric(e.target.value as HealthMetricType)}
          style={{ marginTop: 4 }}
        >
          {HEALTH_METRIC_TYPES.map((m) => (
            <option key={m} value={m}>
              {METRIC_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <p className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
          Linha de base — {METRIC_LABELS[metric]}
        </p>
        {!baseline ? (
          <p className="settings-section__body">
            Amostra insuficiente (mínimo: {getMinimumBaselineSamples(metric)} dia(s) com dado válido).
          </p>
        ) : (
          <p className="settings-section__body">
            {formatValue(baseline.value, metric)} · mediana {formatValue(baseline.median, metric)} · amostra de{" "}
            {baseline.sampleSize} dia(s) · qualidade{" "}
            <span className={qualityBadgeClass(baseline.quality.level)}>{QUALITY_LABELS[baseline.quality.level]}</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <p className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
          Tendência — {METRIC_LABELS[metric]}
        </p>
        <p className="settings-section__body">{trend?.evidence}</p>
      </div>
    </section>
  )
}
