// Motor de equivalência semântica — Sprint 30 Parte 3. Nunca exige
// identidade byte a byte: `id`/`importedAt` são sempre gerados de novo na
// reimportação, então são sempre ignorados. Peso é um caso especial — depois
// de reimportado ele vira um `BodyProgressEntry` e é re-derivado pelo
// adapter, que sempre atribui `source: 'body_progress'`, `quality: 'high'` e
// um novo `externalId` (o id do `BodyProgressEntry`) — comparar esses três
// campos para peso geraria falso-negativo permanente, então são ignorados
// somente para `metric === 'weight'`.

import type { HealthDataRecord } from '../types'

function roundValue(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

function fingerprint(record: HealthDataRecord): string {
  const isWeight = record.metric === 'weight'
  return [
    record.metric,
    roundValue(record.value),
    record.unit,
    record.recordedAt,
    record.startAt ?? '',
    record.endAt ?? '',
    isWeight ? '' : record.source,
    isWeight ? '' : record.externalId ?? '',
    isWeight ? '' : record.quality,
    JSON.stringify(record.metadata ?? {}),
  ].join('|')
}

export interface HealthRecordSetComparison {
  equivalent: boolean
  /** Registros do primeiro conjunto sem par semanticamente equivalente no segundo. */
  onlyInA: HealthDataRecord[]
  /** Registros do segundo conjunto sem par semanticamente equivalente no primeiro. */
  onlyInB: HealthDataRecord[]
}

/**
 * Compara dois conjuntos de registros por multiset de fingerprints — nunca
 * por ordem ou por igualdade estrutural completa. Um registro de `a` "casa"
 * com no máximo um registro de `b` (duplicatas legítimas em `a` exigem a
 * mesma quantidade de duplicatas em `b`).
 */
export function compareHealthRecordSets(a: HealthDataRecord[], b: HealthDataRecord[]): HealthRecordSetComparison {
  const remainingB = new Map<string, HealthDataRecord[]>()
  for (const record of b) {
    const fp = fingerprint(record)
    const bucket = remainingB.get(fp) ?? []
    bucket.push(record)
    remainingB.set(fp, bucket)
  }

  const onlyInA: HealthDataRecord[] = []
  for (const record of a) {
    const fp = fingerprint(record)
    const bucket = remainingB.get(fp)
    if (bucket && bucket.length > 0) {
      bucket.shift()
    } else {
      onlyInA.push(record)
    }
  }

  const onlyInB = Array.from(remainingB.values()).flat()

  return { equivalent: onlyInA.length === 0 && onlyInB.length === 0, onlyInA, onlyInB }
}
