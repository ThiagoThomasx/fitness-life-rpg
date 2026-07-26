// Vocabulário compartilhado da UI do Coach — Sprint 26 Parte 3.
//
// Só rótulos/formatação de apresentação aqui — mesmo padrão de
// `analytics/analytics-ui.ts`. O motor (`src/lib/coach/*`) já entrega os
// dados prontos; este arquivo só traduz os shapes dele em texto/classe CSS
// pt-BR.

import type { CoachActionKind, CoachCategory, CoachConfidence, CoachPriority, CoachRecommendationStatus } from "@/lib/coach/types"

export const PRIORITY_LABELS: Record<CoachPriority, string> = {
  high: "Alta prioridade",
  medium: "Média prioridade",
  low: "Baixa prioridade",
}

export function priorityBadgeClass(priority: CoachPriority): string {
  if (priority === "high") return "badge-pill badge-pill--danger"
  if (priority === "medium") return "badge-pill badge-pill--streak"
  return "badge-pill badge-pill--level"
}

export const CONFIDENCE_LABELS: Record<CoachConfidence, string> = {
  high: "Confiança alta",
  medium: "Confiança média",
  low: "Confiança baixa",
}

export const CATEGORY_LABELS: Record<CoachCategory, string> = {
  recovery: "Recuperação",
  consistency: "Consistência",
  frequency: "Frequência",
  progression: "Progressão",
  volume: "Volume",
  muscle_balance: "Músculos",
  training_load: "Carga",
  records: "Recordes",
  stagnation: "Estagnação",
  program: "Programa",
}

export const STATUS_LABELS: Record<CoachRecommendationStatus, string> = {
  nova: "Nova",
  visualizada: "Visualizada",
  ignorada: "Ignorada",
  aceita: "Aceita",
  expirada: "Expirada",
}

export function statusBadgeClass(status: CoachRecommendationStatus): string {
  if (status === "aceita") return "badge-pill badge-pill--accent"
  if (status === "ignorada" || status === "expirada") return "badge-pill badge-pill--level"
  return "badge-pill badge-pill--xp"
}

const ACTION_ROUTE_BUILDERS: Record<CoachActionKind, (id?: string) => string> = {
  exercise: (id) => `/exercicios/${id ?? ""}`,
  workout: (id) => `/historico/${id ?? ""}`,
  program: (id) => `/programas/${id ?? ""}`,
  history: () => "/historico",
  planner: () => "/plano",
}

export function actionHref(kind: CoachActionKind, id?: string): string {
  return ACTION_ROUTE_BUILDERS[kind](id)
}
