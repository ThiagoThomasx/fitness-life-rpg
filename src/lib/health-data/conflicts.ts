// Conflitos — Sprint 28 Parte 3. Detecta divergência entre fontes diferentes
// para a mesma métrica no mesmo dia. Apenas REGISTRA o conflito — nunca
// resolve automaticamente (ver `HEALTH-CONFLICTS.md`). Resolução por
// prioridade de fonte é trabalho futuro (Parte 4), citado aqui só como
// `suggestion` textual.

import { METRIC_LABELS, toDateKey } from './aggregation-shared'
import type { HealthConflictSeverity, HealthDataConflict, HealthDataRecord, HealthMetricType } from './types'

interface ConflictThreshold {
  /** Divergência percentual (0-100) acima da qual os valores são considerados conflitantes. */
  percent?: number
  /** Divergência absoluta (na unidade canônica da métrica) acima da qual os valores conflitam — usado quando percentual não faz sentido (ex.: escalas de 1-5). */
  absolute?: number
}

/** Limiares por métrica — calibrados para não sinalizar ruído normal de medição, só divergências que indicam fontes discordantes. */
const CONFLICT_THRESHOLDS: Record<HealthMetricType, ConflictThreshold> = {
  steps: { percent: 20 },
  sleep_duration: { percent: 25 },
  sleep_quality: { absolute: 2 },
  resting_heart_rate: { absolute: 8 },
  weight: { percent: 5 },
  active_calories: { percent: 25 },
  activity_duration: { percent: 25 },
  distance: { percent: 25 },
  wellness_energy: { absolute: 2 },
  wellness_soreness: { absolute: 2 },
  wellness_motivation: { absolute: 2 },
}

/** Um valor representativo por fonte, para comparação — o mais recente registro daquela fonte no dia. */
function latestPerSource(records: readonly HealthDataRecord[]): Map<string, HealthDataRecord> {
  const bySource = new Map<string, HealthDataRecord>()
  for (const record of records) {
    const current = bySource.get(record.source)
    if (!current || record.recordedAt > current.recordedAt) {
      bySource.set(record.source, record)
    }
  }
  return bySource
}

function computeSeverity(divergence: number, threshold: number): HealthConflictSeverity {
  const ratio = divergence / threshold
  if (ratio >= 4) return 'high'
  if (ratio >= 2) return 'medium'
  return 'low'
}

function buildReason(metric: HealthMetricType, low: HealthDataRecord, high: HealthDataRecord, divergenceLabel: string): string {
  return `${METRIC_LABELS[metric]}: ${low.source} (${low.value} ${low.unit}) vs ${high.source} (${high.value} ${high.unit}) — divergência de ${divergenceLabel}`
}

/**
 * Detecta um conflito entre os valores representativos de cada fonte, para
 * uma métrica+dia. Retorna `null` quando há menos de duas fontes ou a
 * divergência está dentro do limiar.
 */
function detectConflictForGroup(
  metric: HealthMetricType,
  date: string,
  records: readonly HealthDataRecord[]
): HealthDataConflict | null {
  const bySource = latestPerSource(records)
  if (bySource.size < 2) return null

  const entries = Array.from(bySource.values()).sort((a, b) => a.value - b.value)
  const low = entries[0]
  const high = entries[entries.length - 1]
  const threshold = CONFLICT_THRESHOLDS[metric]

  if (threshold.absolute !== undefined) {
    const divergence = high.value - low.value
    if (divergence <= threshold.absolute) return null
    return {
      metric,
      date,
      recordIds: entries.map((r) => r.id),
      sources: entries.map((r) => r.source),
      reason: buildReason(metric, low, high, `${divergence.toFixed(1)} ${low.unit}`),
      severity: computeSeverity(divergence, threshold.absolute),
    }
  }

  const percentThreshold = threshold.percent ?? 100
  if (low.value === 0) return null
  const divergencePercent = ((high.value - low.value) / low.value) * 100
  if (divergencePercent <= percentThreshold) return null

  return {
    metric,
    date,
    recordIds: entries.map((r) => r.id),
    sources: entries.map((r) => r.source),
    reason: buildReason(metric, low, high, `${divergencePercent.toFixed(0)}%`),
    severity: computeSeverity(divergencePercent, percentThreshold),
  }
}

/**
 * Detecta conflitos entre fontes para todos os registros informados,
 * agrupando por métrica+dia. Determinístico e puro — não persiste nada.
 */
export function detectConflicts(records: readonly HealthDataRecord[]): HealthDataConflict[] {
  const groups = new Map<string, HealthDataRecord[]>()
  for (const record of records) {
    const key = `${record.metric}|${toDateKey(record.recordedAt)}`
    const group = groups.get(key)
    if (group) {
      group.push(record)
    } else {
      groups.set(key, [record])
    }
  }

  const conflicts: HealthDataConflict[] = []
  for (const [key, group] of Array.from(groups)) {
    const [metric, date] = key.split('|') as [HealthMetricType, string]
    const conflict = detectConflictForGroup(metric, date, group)
    if (conflict) conflicts.push(conflict)
  }

  return conflicts.sort((a, b) => (a.date === b.date ? a.metric.localeCompare(b.metric) : b.date.localeCompare(a.date)))
}

/** Conflitos de uma métrica+dia específicos, dentro de uma lista maior já filtrada. */
export function getConflictsForDay(conflicts: readonly HealthDataConflict[], date: string): HealthDataConflict[] {
  return conflicts.filter((c) => c.date === date)
}
