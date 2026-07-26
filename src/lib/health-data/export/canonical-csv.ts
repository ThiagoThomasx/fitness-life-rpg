// CSV canônico — Sprint 30 Parte 3. Cabeçalho compatível com
// `parseHealthDataCsvImport`/`inspectCsvHeader` (`CANONICAL_COLUMNS`): um
// arquivo exportado aqui é reconhecido como canônico e pula o wizard de
// mapeamento na reimportação. `quality` e `metadata` são colunas extras,
// informativas — o parser de importação não as lê (não faz parte de
// `CANONICAL_COLUMNS`), então não são restauradas ao reimportar via CSV; para
// preservar metadata em um round-trip completo, use o formato JSON.

import { csvRow } from './csv-safety'
import type { HealthDataRecord } from '../types'

export const CANONICAL_CSV_HEADERS = [
  'metric',
  'value',
  'unit',
  'recordedAt',
  'startAt',
  'endAt',
  'source',
  'externalId',
  'quality',
  'metadata',
] as const

function serializeMetadata(metadata: HealthDataRecord['metadata']): string {
  if (!metadata || Object.keys(metadata).length === 0) return ''
  return JSON.stringify(metadata)
}

export function buildHealthDataCanonicalCsv(records: HealthDataRecord[]): string {
  const rows = records.map((r) =>
    csvRow([
      { value: r.metric },
      { value: r.value, numeric: true },
      { value: r.unit },
      { value: r.recordedAt },
      { value: r.startAt },
      { value: r.endAt },
      { value: r.source },
      { value: r.externalId },
      { value: r.quality },
      { value: serializeMetadata(r.metadata) },
    ])
  )
  return [CANONICAL_CSV_HEADERS.join(','), ...rows].join('\n')
}
