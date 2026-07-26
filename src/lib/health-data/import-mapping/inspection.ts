// Inspeção de arquivo — Sprint 30 Parte 2 (seções 8, 22, 23, 24). Decide, sem
// nunca importar, se um CSV já é compatível com o parser canônico
// (`import-csv.ts`) — nesse caso o mapeamento pode ser pulado (seção 23).
// JSON é sempre canônico nesta sprint (seção 22) — nenhuma decisão a tomar.

import { resolveCanonicalColumn } from '../import-csv'
import { parseCsvText } from '../csv-parser'
import type { HealthImportFile } from './types'

const MAX_SAMPLE_ROWS = 5

export interface CsvHeaderInspection {
  /** Todo campo obrigatório do importador canônico (metric + [value | startAt+endAt] + [recordedAt | startAt | endAt]) já resolve a partir do cabeçalho. */
  isCanonical: boolean
  resolvedColumns: string[]
  unresolvedColumns: string[]
}

/**
 * Verifica se o cabeçalho de um CSV já é 100% compatível com
 * `parseHealthDataCsvImport` — mesma condição que esse parser exige para
 * funcionar (coluna `metric` resolvida, e `value` ou `startAt`+`endAt`, e
 * `recordedAt`/`startAt`/`endAt`). Nunca avalia os valores das linhas, só o
 * cabeçalho — dados inválidos linha a linha continuam sendo pegos no preview.
 */
export function inspectCsvHeader(header: string[]): CsvHeaderInspection {
  const resolvedColumns: string[] = []
  const unresolvedColumns: string[] = []
  const resolved = new Set<string>()

  for (const column of header) {
    const canonical = resolveCanonicalColumn(column)
    if (canonical) {
      resolvedColumns.push(column)
      resolved.add(canonical)
    } else {
      unresolvedColumns.push(column)
    }
  }

  const hasMetric = resolved.has('metric')
  const hasValue = resolved.has('value') || (resolved.has('startAt') && resolved.has('endAt'))
  const hasRecordedAt = resolved.has('recordedAt') || resolved.has('startAt') || resolved.has('endAt')

  return { isCanonical: hasMetric && hasValue && hasRecordedAt, resolvedColumns, unresolvedColumns }
}

/** Constrói o `HealthImportFile` usado pela detecção (`detection.ts`) a partir de um CSV já lido. */
export function buildCsvImportFile(fileName: string, text: string): HealthImportFile {
  const { header, rows } = parseCsvText(text)
  return { name: fileName, kind: 'csv', header, sampleRows: rows.slice(0, MAX_SAMPLE_ROWS) }
}
