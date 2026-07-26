// JSON canônico — Sprint 30 Parte 3. O envelope `{ version, records }` é
// exatamente o schema já aceito por `parseHealthDataJsonImport` — o arquivo
// exportado aqui é reimportável sem nenhum parser novo. `filters`/`exportedAt`/
// `recordCount` são metadados extras, ignorados pelo parser de importação
// (que só lê `version` e `records`), então não quebram round-trip.

import type { HealthDataRecord } from '../types'
import type { HealthExportFilters, HealthDataCanonicalExport } from './types'
import { HEALTH_DATA_EXPORT_VERSION } from './types'

export function buildHealthDataCanonicalExport(
  records: HealthDataRecord[],
  filters: HealthExportFilters,
  now: Date = new Date()
): HealthDataCanonicalExport {
  return {
    version: HEALTH_DATA_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    filters,
    recordCount: records.length,
    records,
  }
}

export function serializeHealthDataCanonicalExport(payload: HealthDataCanonicalExport): string {
  return JSON.stringify(payload, null, 2)
}
