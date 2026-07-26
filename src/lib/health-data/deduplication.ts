// Deduplicação — Sprint 28. Determinística: a mesma importação repetida não
// pode duplicar registros. Ordem de identidade, da mais para a menos forte:
//   1. source + externalId
//   2. metric + source + recordedAt
//   3. hash determinístico dos campos principais
// Nunca depende apenas do `id` gerado na importação (ids são sempre novos).

import type { HealthDataRecord } from './types'

function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

/**
 * Chave de identidade determinística de um registro. Dois registros com a
 * mesma chave são considerados o mesmo dado, ainda que tenham `id` diferente.
 */
export function computeDedupKey(record: Pick<HealthDataRecord, 'metric' | 'source' | 'externalId' | 'recordedAt' | 'value' | 'startAt' | 'endAt'>): string {
  if (record.externalId) {
    return `ext:${record.source}:${record.externalId}`
  }

  if (record.recordedAt) {
    return `msr:${record.metric}:${record.source}:${record.recordedAt}`
  }

  return `hash:${simpleHash(
    [record.metric, record.source, record.value, record.startAt ?? '', record.endAt ?? ''].join('|')
  )}`
}

export interface DeduplicationResult {
  unique: HealthDataRecord[]
  duplicates: HealthDataRecord[]
}

/**
 * Remove duplicatas de uma lista de registros candidatos em relação aos
 * registros já existentes, e entre si. Mantém a primeira ocorrência de cada
 * chave (ordem de `candidates`).
 */
export function deduplicateRecords(
  existing: readonly HealthDataRecord[],
  candidates: readonly HealthDataRecord[]
): DeduplicationResult {
  const seenKeys = new Set(existing.map(computeDedupKey))
  const unique: HealthDataRecord[] = []
  const duplicates: HealthDataRecord[] = []

  for (const candidate of candidates) {
    const key = computeDedupKey(candidate)
    if (seenKeys.has(key)) {
      duplicates.push(candidate)
    } else {
      seenKeys.add(key)
      unique.push(candidate)
    }
  }

  return { unique, duplicates }
}
