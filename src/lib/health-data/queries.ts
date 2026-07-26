// Queries — Sprint 28 Parte 1. Somente as consultas que não dependem de
// agregação diária (Parte 3) ou de conflitos entre fontes (Parte 3/4).

import { getWeightRecordsFromBodyProgress } from './body-progress-adapter'
import { getHealthDataRecords } from './storage'
import type { HealthDataRecord, HealthMetricType } from './types'

/**
 * Todos os registros de um domínio, incluindo os derivados de outros
 * domínios (hoje só peso via Body Progress). Único ponto que combina as
 * duas fontes — motores consumidores nunca devem ler `body-progress.ts`
 * diretamente para fins de saúde.
 */
function getAllRecordsIncludingAdapters(): HealthDataRecord[] {
  return [...getHealthDataRecords(), ...getWeightRecordsFromBodyProgress()]
}

/** Todos os registros de todas as métricas, mais recentes primeiro — usado pela lista da UI de Saúde (Parte 2). */
export function getAllHealthRecords(): HealthDataRecord[] {
  return getAllRecordsIncludingAdapters().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
}

export function getHealthRecordsByMetric(metric: HealthMetricType): HealthDataRecord[] {
  return getAllRecordsIncludingAdapters()
    .filter((r) => r.metric === metric)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export function getLatestHealthMetric(metric: HealthMetricType): HealthDataRecord | null {
  const records = getHealthRecordsByMetric(metric)
  return records.length > 0 ? records[records.length - 1] : null
}

export function getHealthRecordsForPeriod(
  metric: HealthMetricType,
  startIso: string,
  endIso: string
): HealthDataRecord[] {
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endIso).getTime()
  return getHealthRecordsByMetric(metric).filter((r) => {
    const recordedMs = new Date(r.recordedAt).getTime()
    return recordedMs >= startMs && recordedMs <= endMs
  })
}
