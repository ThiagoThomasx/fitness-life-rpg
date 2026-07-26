// Vocabulário compartilhado da UI de Dashboard Analytics — Sprint 25 Parte 4B.
//
// Só rótulos/formatação de apresentação aqui — nenhuma lógica de negócio.
// Os motores (src/lib/analytics/*) já entregam os dados prontos; este arquivo
// só traduz os shapes deles (TrendDirection, AnalyticsPeriod, severidade de
// insight) em texto/classe CSS pt-BR, mesmo padrão de METRIC_LABELS/
// DIRECTION_LABELS já usado em `ExerciseTrendsSection.tsx`.

import type { AnalyticsPeriod, TrendDirection, AnalyticsInsight } from "@/lib/analytics/types"
import type { PerformanceMetricKey } from "@/lib/analytics/performance"

export const PERIOD_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "6m", label: "6 meses" },
  { id: "1y", label: "1 ano" },
  { id: "all", label: "Tudo" },
]

export const METRIC_LABELS: Record<PerformanceMetricKey, string> = {
  load: "Carga",
  volume: "Volume",
  "1rm": "1RM estimado",
  reps: "Repetições",
  frequency: "Frequência",
}

export const DIRECTION_LABELS: Record<TrendDirection, string> = {
  increasing: "Em alta",
  decreasing: "Em queda",
  stable: "Estável",
  insufficient_data: "Dados insuficientes",
}

export const DIRECTION_ICON: Record<TrendDirection, string> = {
  increasing: "↑",
  decreasing: "↓",
  stable: "→",
  insufficient_data: "—",
}

export function directionBadgeClass(direction: TrendDirection): string {
  if (direction === "increasing") return "badge-pill badge-pill--accent"
  if (direction === "decreasing") return "badge-pill badge-pill--danger"
  return "badge-pill badge-pill--level"
}

export const INSIGHT_SEVERITY_LABELS: Record<AnalyticsInsight["severity"], string> = {
  info: "Observação",
  attention: "Atenção",
  notable: "Destaque",
}

export function insightBadgeClass(severity: AnalyticsInsight["severity"]): string {
  if (severity === "notable") return "badge-pill badge-pill--accent"
  if (severity === "attention") return "badge-pill badge-pill--danger"
  return "badge-pill badge-pill--level"
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—"
  const rounded = Math.round(value)
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}

export function formatKg(value: number): string {
  return `${Math.round(value)}kg`
}

const MONTH_LABELS_PT: Record<string, string> = {
  "01": "janeiro",
  "02": "fevereiro",
  "03": "março",
  "04": "abril",
  "05": "maio",
  "06": "junho",
  "07": "julho",
  "08": "agosto",
  "09": "setembro",
  "10": "outubro",
  "11": "novembro",
  "12": "dezembro",
}

/** Mesmo formato de `insights.ts` (`formatMonthLabel`) — "YYYY-MM" pt-BR. */
export function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-")
  return `${MONTH_LABELS_PT[month] ?? month} de ${year}`
}
