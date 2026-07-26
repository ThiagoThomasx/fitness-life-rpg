// Consulta de exportação — Sprint 30 Parte 3. Função pura: consulta os
// registros persistidos (incluindo peso via adapter de Body Progress),
// aplica os filtros e ordena deterministicamente. Nunca persiste nada.

import { resolvePeriodRange, filterByDateRange } from '../../analytics/helpers'
import { getAllHealthRecords } from '../queries'
import type { HealthDataRecord } from '../types'
import type { HealthExportFilters } from './types'

function compareRecords(a: HealthDataRecord, b: HealthDataRecord): number {
  const byDate = a.recordedAt.localeCompare(b.recordedAt)
  if (byDate !== 0) return byDate
  const byMetric = a.metric.localeCompare(b.metric)
  if (byMetric !== 0) return byMetric
  const bySource = a.source.localeCompare(b.source)
  if (bySource !== 0) return bySource
  return (a.externalId ?? '').localeCompare(b.externalId ?? '')
}

/**
 * Registros prontos para exportação: filtrados e ordenados de forma estável
 * (`recordedAt` → `metric` → `source` → `externalId`), nunca dependente da
 * ordem de inserção do `localStorage`.
 */
export function getHealthRecordsForExport(filters: HealthExportFilters, now: Date = new Date()): HealthDataRecord[] {
  let records = getAllHealthRecords()

  if (filters.includeWeight === false) {
    records = records.filter((r) => r.metric !== 'weight')
  }

  if (filters.metrics && filters.metrics.length > 0) {
    const metricSet = new Set(filters.metrics)
    records = records.filter((r) => metricSet.has(r.metric))
  }

  if (filters.sources && filters.sources.length > 0) {
    const sourceSet = new Set(filters.sources)
    records = records.filter((r) => sourceSet.has(r.source))
  }

  if (filters.customRange) {
    const start = new Date(filters.customRange.start)
    const end = new Date(filters.customRange.end)
    records = filterByDateRange(records, { start, end }, (r) => r.recordedAt)
  } else if (filters.period) {
    const range = resolvePeriodRange(filters.period, now)
    records = filterByDateRange(records, range, (r) => r.recordedAt)
  }

  return [...records].sort(compareRecords)
}
