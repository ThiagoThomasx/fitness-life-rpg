// Motor de prévia de exportação — Sprint 30 Parte 3. Puro: nunca gera o
// arquivo em si, só o resumo mostrado antes do download (seção 16/17).

import { periodLabel } from '../../coach/helpers'
import { HEALTH_METRIC_TYPES } from '../types'
import type { HealthDataRecord, HealthMetricType } from '../types'
import { buildHealthExportFilename } from './filenames'
import type { HealthExportFilters, HealthExportFormat, HealthExportPreview } from './types'

function sortedUnique<T>(values: T[], order: readonly T[]): T[] {
  const set = new Set(values)
  return order.filter((v) => set.has(v))
}

function resolvePeriodLabel(filters: HealthExportFilters): string {
  if (filters.customRange) {
    return `${filters.customRange.start} a ${filters.customRange.end}`
  }
  if (filters.period) return periodLabel(filters.period)
  return periodLabel('all')
}

export function buildHealthExportPreview(
  format: HealthExportFormat,
  records: HealthDataRecord[],
  filters: HealthExportFilters,
  serializedContent: string,
  now: Date = new Date()
): HealthExportPreview {
  const metrics = sortedUnique(records.map((r) => r.metric), HEALTH_METRIC_TYPES) as HealthMetricType[]
  const sources = Array.from(new Set(records.map((r) => r.source))).sort()
  const includesWeight = records.some((r) => r.metric === 'weight')

  const warnings: string[] = []
  if (records.length === 0) {
    warnings.push('Nenhum registro corresponde aos filtros selecionados.')
  }

  return {
    format,
    count: records.length,
    metrics,
    sources,
    periodLabel: resolvePeriodLabel(filters),
    estimatedBytes: new TextEncoder().encode(serializedContent).length,
    filename: buildHealthExportFilename(format, metrics, now),
    includesWeight,
    warnings,
  }
}
