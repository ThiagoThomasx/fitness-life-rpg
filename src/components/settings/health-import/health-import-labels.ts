// Rótulos compartilhados da experiência de mapeamento — Sprint 30 Parte 2.
// Puramente apresentacional; nenhuma lógica de importação vive aqui.

import type { CSSProperties } from "react"
import type { HealthDataSource, HealthMetricType } from "@/lib/health-data"
import type { HealthImportDateFormat, HealthImportDetectionConfidence, HealthImportTargetField } from "@/lib/health-data"

export const METRIC_LABELS: Record<HealthMetricType, string> = {
  steps: "Passos",
  sleep_duration: "Sono (duração)",
  sleep_quality: "Qualidade do sono",
  resting_heart_rate: "FC de repouso",
  weight: "Peso",
  active_calories: "Calorias ativas",
  activity_duration: "Duração de atividade",
  distance: "Distância",
  wellness_energy: "Energia",
  wellness_soreness: "Dor muscular",
  wellness_motivation: "Motivação",
}

export const TARGET_FIELD_LABELS: Record<HealthImportTargetField, string> = {
  metric: "Métrica",
  value: "Valor",
  unit: "Unidade",
  recordedAt: "Data/hora do registro",
  startAt: "Início do intervalo",
  endAt: "Fim do intervalo",
  source: "Fonte",
  externalId: "ID externo",
  timeColumn: "Hora (combinar com data)",
}

export const CONFIDENCE_LABELS: Record<HealthImportDetectionConfidence, string> = {
  high: "confiança alta",
  medium: "confiança média",
  low: "confiança baixa",
}

export const DATE_FORMAT_LABELS: Record<HealthImportDateFormat, string> = {
  ISO: "ISO 8601 (2026-07-12T10:00:00Z)",
  "YYYY-MM-DD": "AAAA-MM-DD",
  "DD/MM/YYYY": "DD/MM/AAAA",
  "MM/DD/YYYY": "MM/DD/AAAA",
  "DD-MM-YYYY": "DD-MM-AAAA",
  "YYYY/MM/DD": "AAAA/MM/DD",
  "DD/MM/YYYY HH:mm": "DD/MM/AAAA HH:mm",
  "YYYY-MM-DD HH:mm:ss": "AAAA-MM-DD HH:mm:ss",
}

export const SOURCE_LABELS: Record<HealthDataSource, string> = {
  manual: "Manual",
  workout: "Treino",
  body_progress: "Progresso corporal",
  wellness: "Bem-estar",
  json_import: "Importação JSON",
  csv_import: "Importação CSV",
  health_connect: "Health Connect",
  samsung_health: "Samsung Health",
  apple_health: "Apple Health",
  google_fit: "Google Fit",
}

export const REQUIRED_MAPPING_FIELDS: readonly HealthImportTargetField[] = ["metric", "value", "recordedAt"]

export const labelStyle: CSSProperties = {
  fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500,
  display: "block", marginBottom: 6,
}

export const hintStyle: CSSProperties = {
  fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 6,
}

export const inputStyle: CSSProperties = {
  width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
  border: "1px solid var(--color-border-subtle)",
  background: "var(--color-bg-subtle)",
  color: "var(--color-text-primary)", fontSize: "var(--text-sm)",
  outline: "none", boxSizing: "border-box",
}
