// Qualidade diária — Sprint 28 Parte 3. Diferente de `quality.ts` (qualidade
// de UM registro no momento da entrada), este módulo julga o CONJUNTO de
// registros de um dia: conflitos entre fontes e a proporção de registros de
// baixa qualidade individual pesam na nota do dia. Determinístico, sem IA.

import type { HealthDataConflict, HealthDataQuality, HealthDataRecord } from './types'

const LOW_QUALITY_RATIO_THRESHOLD = 0.5

function countByLevel(records: readonly HealthDataRecord[]): Record<'high' | 'medium' | 'low' | 'unknown', number> {
  const counts = { high: 0, medium: 0, low: 0, unknown: 0 }
  for (const record of records) {
    counts[record.quality]++
  }
  return counts
}

/**
 * Qualidade agregada de um dia, a partir dos registros daquele dia e dos
 * conflitos já detectados entre eles (ver `conflicts.ts`). Nunca reaplica a
 * lógica de `computeRecordQuality` — apenas combina os níveis já calculados
 * por registro com o sinal adicional de conflito entre fontes.
 */
export function computeDailyQuality(
  records: readonly HealthDataRecord[],
  conflicts: readonly HealthDataConflict[]
): HealthDataQuality {
  if (records.length === 0) {
    return { level: 'unknown', reasons: ['sem registros neste dia'] }
  }

  const counts = countByLevel(records)
  const lowRatio = (counts.low + counts.unknown) / records.length
  const hasHighSeverityConflict = conflicts.some((c) => c.severity === 'high')

  const reasons: string[] = []
  if (conflicts.length > 0) {
    reasons.push(`${conflicts.length} conflito(s) entre fontes neste dia`)
  }
  if (lowRatio > LOW_QUALITY_RATIO_THRESHOLD) {
    reasons.push('mais da metade dos registros do dia têm qualidade baixa ou desconhecida')
  }

  if (hasHighSeverityConflict || lowRatio > LOW_QUALITY_RATIO_THRESHOLD) {
    return { level: 'low', reasons }
  }

  if (conflicts.length > 0 || lowRatio > 0) {
    if (reasons.length === 0) reasons.push('parte dos registros do dia têm qualidade média')
    return { level: 'medium', reasons }
  }

  if (counts.high === records.length) {
    return { level: 'high', reasons: ['todos os registros do dia são de alta qualidade, sem conflitos'] }
  }

  return { level: 'medium', reasons: ['registros de qualidade mista, sem conflitos'] }
}
