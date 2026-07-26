// Helpers compartilhados entre `aggregation.ts` e `conflicts.ts` — evita
// duplicar a definição de "dia" e de prioridade de fonte entre os dois
// motores, que precisam concordar exatamente nesses dois conceitos.

import type { DailyHealthSummary, HealthDataSource, HealthMetricType } from './types'

/** Recorte de dia (`YYYY-MM-DD`) a partir de um timestamp ISO — sempre em UTC, mesma convenção usada pela deduplicação de peso. */
export function toDateKey(recordedAt: string): string {
  return recordedAt.slice(0, 10)
}

/**
 * Prioridade de fonte para agregação diária, da mais para a menos confiável.
 * Fontes de entrada direta vêm antes de importações em lote, que vêm antes de
 * integrações de dispositivo (ainda não ativas — ver `ACTIVE_HEALTH_DATA_SOURCES`).
 * Usada quando duas fontes reportam a mesma métrica no mesmo dia e a
 * estratégia de agregação exige escolher uma só (nunca somar duas fontes).
 */
export const SOURCE_PRIORITY: readonly HealthDataSource[] = [
  'manual',
  'wellness',
  'workout',
  'body_progress',
  'csv_import',
  'json_import',
  'health_connect',
  'samsung_health',
  'apple_health',
  'google_fit',
]

/** Fonte de maior prioridade presente num conjunto de registros do mesmo dia. */
export function highestPrioritySource(sources: readonly HealthDataSource[]): HealthDataSource | null {
  if (sources.length === 0) return null
  let best: HealthDataSource = sources[0]
  let bestRank = SOURCE_PRIORITY.indexOf(best)
  for (const source of sources) {
    const rank = SOURCE_PRIORITY.indexOf(source)
    if (rank !== -1 && (bestRank === -1 || rank < bestRank)) {
      best = source
      bestRank = rank
    }
  }
  return best
}

/** Campos numéricos de `DailyHealthSummary` — todos exceto os metadados (`date`/`sources`/`quality`/`conflicts`). */
export type DailySummaryMetricField = Exclude<keyof DailyHealthSummary, 'date' | 'sources' | 'quality' | 'conflicts'>

/**
 * Mapeia cada métrica ao campo correspondente em `DailyHealthSummary`.
 * Compartilhado por `aggregation.ts` (para preencher o resumo), `baseline.ts`
 * e `trends.ts` (para extrair a série histórica de um resumo já pronto).
 */
export const METRIC_SUMMARY_FIELD: Record<HealthMetricType, DailySummaryMetricField> = {
  steps: 'steps',
  sleep_duration: 'sleepMinutes',
  sleep_quality: 'sleepQuality',
  resting_heart_rate: 'restingHeartRate',
  weight: 'weightKg',
  active_calories: 'activeCalories',
  activity_duration: 'activityMinutes',
  distance: 'distanceKm',
  wellness_energy: 'wellnessEnergy',
  wellness_soreness: 'wellnessSoreness',
  wellness_motivation: 'wellnessMotivation',
}

/** Extrai o valor numérico de uma métrica a partir de um resumo diário já construído. */
export function summaryMetricValue(summary: DailyHealthSummary, metric: HealthMetricType): number | undefined {
  return summary[METRIC_SUMMARY_FIELD[metric]] as number | undefined
}

/** Rótulos em pt-BR — únicos, compartilhados entre `conflicts.ts`, `trends.ts` e a UI de Saúde. */
export const METRIC_LABELS: Record<HealthMetricType, string> = {
  steps: 'Passos',
  sleep_duration: 'Sono',
  sleep_quality: 'Qualidade do sono',
  resting_heart_rate: 'FC de repouso',
  weight: 'Peso',
  active_calories: 'Calorias ativas',
  activity_duration: 'Duração de atividade',
  distance: 'Distância',
  wellness_energy: 'Energia',
  wellness_soreness: 'Dor muscular',
  wellness_motivation: 'Motivação',
}
