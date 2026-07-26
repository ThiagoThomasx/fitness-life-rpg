// Portabilidade — Sprint 30 Parte 3. Modelos puros de exportação. Nunca
// inclui dados derivados (baseline, tendência, conflitos, resumo, consumer
// context, sinais de Coach) — só registros persistidos/derivados de fonte
// (`HealthDataRecord`, incluindo o adapter de peso) e metadados do próprio
// arquivo exportado.

import type { AnalyticsPeriod } from '../../analytics/types'
import type { HealthDataSource, HealthDataRecord, HealthMetricType } from '../types'

export type HealthExportFormat = 'json' | 'csv'

export interface HealthExportCustomRange {
  start: string
  end: string
}

export interface HealthExportFilters {
  metrics?: HealthMetricType[]
  sources?: HealthDataSource[]
  period?: AnalyticsPeriod
  customRange?: HealthExportCustomRange
  /** `false` remove peso (fonte `body_progress`) do resultado. Padrão: incluído. */
  includeWeight?: boolean
}

/** Formato canônico versionado — o mesmo schema aceito por `parseHealthDataJsonImport`, com um envelope de metadados de exportação. */
export const HEALTH_DATA_EXPORT_VERSION = 1

export interface HealthDataCanonicalExport {
  version: number
  exportedAt: string
  filters: HealthExportFilters
  recordCount: number
  records: HealthDataRecord[]
}

export interface HealthExportPreview {
  format: HealthExportFormat
  count: number
  metrics: HealthMetricType[]
  sources: HealthDataSource[]
  periodLabel: string
  estimatedBytes: number
  filename: string
  includesWeight: boolean
  warnings: string[]
}
