// Prévia de importação — Sprint 28 Parte 2. Modelo puro: nunca persiste
// nada. Reaproveita integralmente a Parte 1 (validação, normalização,
// qualidade, deduplicação) — não reimplementa nenhuma regra aqui.

import { deduplicateRecords } from './deduplication'
import { buildHealthDataRecord, normalizeUnit } from './normalization'
import { computeRecordQuality } from './quality'
import { getHealthRecordsByMetric } from './queries'
import { validateHealthDataInput } from './validation'
import type {
  HealthDataRecord,
  HealthImportError,
  HealthImportFileKind,
  HealthImportPreview,
  HealthMetricType,
} from './types'
import type { ParsedImportItem } from './import-json'

interface BuiltRecord {
  record: HealthDataRecord
}

/**
 * Constrói a prévia de importação a partir dos itens já parseados (JSON ou
 * CSV — mesma forma de item nos dois casos). Deduplicação roda por métrica,
 * contra os registros já existentes (incluindo os derivados de Body
 * Progress, no caso de peso) e entre os próprios candidatos do arquivo.
 */
export function buildHealthImportPreview(
  fileKind: HealthImportFileKind,
  items: ParsedImportItem[]
): HealthImportPreview {
  const invalidRecords: HealthImportError[] = []
  const builtByMetric = new Map<HealthMetricType, BuiltRecord[]>()

  for (const item of items) {
    if (item.error || !item.input) {
      invalidRecords.push({ index: item.index, reason: item.error ?? 'Registro inválido.' })
      continue
    }

    const validation = validateHealthDataInput(item.input)
    if (!validation.valid) {
      invalidRecords.push({ index: item.index, reason: validation.errors.join(' '), raw: item.input })
      continue
    }

    const normalized = normalizeUnit(item.input.metric, item.input.value, item.input.unit)
    if (!normalized) {
      invalidRecords.push({
        index: item.index,
        reason: `Unidade "${item.input.unit}" não suportada para esta métrica.`,
        raw: item.input,
      })
      continue
    }

    const quality = computeRecordQuality(item.input)
    const record = buildHealthDataRecord(item.input, normalized, quality.level)
    const bucket = builtByMetric.get(item.input.metric) ?? []
    bucket.push({ record })
    builtByMetric.set(item.input.metric, bucket)
  }

  const validRecords: HealthDataRecord[] = []
  const duplicateRecords: HealthImportPreview['duplicateRecords'] = []

  for (const [metric, built] of Array.from(builtByMetric.entries())) {
    const existing = getHealthRecordsByMetric(metric)
    const { unique, duplicates } = deduplicateRecords(existing, built.map((b: BuiltRecord) => b.record))
    validRecords.push(...unique)
    for (const duplicate of duplicates) {
      duplicateRecords.push({ record: duplicate, reason: 'Registro já existe (mesma identidade determinística).' })
    }
  }

  const qualityBreakdown = { high: 0, medium: 0, low: 0, unknown: 0 }
  for (const record of validRecords) {
    qualityBreakdown[record.quality]++
  }

  const total = items.length

  return {
    fileKind,
    total,
    valid: validRecords.length + duplicateRecords.length,
    invalid: invalidRecords.length,
    duplicates: duplicateRecords.length,
    readyToImport: validRecords.length,
    validRecords,
    duplicateRecords,
    invalidRecords,
    qualityBreakdown,
  }
}
