// Vocabulário de apresentação da experiência de Recuperação — Sprint 29
// Parte 2. Só rótulos/formatação aqui, mesma convenção de
// `dashboard/analytics/analytics-ui.ts` — nenhuma lógica de negócio.

import type { HealthDataSource, HealthTrendDirection } from "@/lib/health-data"

export const SOURCE_LABELS: Record<HealthDataSource, string> = {
  manual: "Entrada manual",
  workout: "Treino",
  body_progress: "Progresso Corporal",
  wellness: "Bem-estar (Readiness)",
  json_import: "Importação JSON",
  csv_import: "Importação CSV",
  health_connect: "Health Connect",
  samsung_health: "Samsung Health",
  apple_health: "Apple Health",
  google_fit: "Google Fit",
}

export const CONFLICT_SEVERITY_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}

export function conflictSeverityBadgeClass(severity: "low" | "medium" | "high"): string {
  if (severity === "high") return "badge-pill badge-pill--danger"
  if (severity === "medium") return "badge-pill badge-pill--level"
  return "badge-pill badge-pill--level"
}

export function formatDateShort(iso: string): string {
  const d = new Date(`${iso.length === 10 ? iso : iso.slice(0, 10)}T00:00:00.000Z`)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
}

export function formatMinutesAsHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h${m.toString().padStart(2, "0")}`
}

export const TREND_LABELS: Record<HealthTrendDirection, string> = {
  increasing: "Em alta",
  decreasing: "Em queda",
  stable: "Estável",
  irregular: "Irregular",
  insufficient_data: "Dados insuficientes",
}

export function trendBadgeClass(direction: HealthTrendDirection): string {
  if (direction === "increasing") return "badge-pill badge-pill--accent"
  if (direction === "decreasing") return "badge-pill badge-pill--danger"
  if (direction === "insufficient_data") return "badge-pill badge-pill--level"
  return "badge-pill badge-pill--level"
}

export function formatDelta(delta: number | null, unit: string, decimals = 0): string {
  if (delta === null) return "—"
  const rounded = Number(delta.toFixed(decimals))
  const sign = rounded > 0 ? "+" : ""
  return `${sign}${rounded}${unit}`
}
