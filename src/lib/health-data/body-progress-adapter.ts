// Adapter de Body Progress — Sprint 28. Decisão arquitetural: Body Progress
// continua a única fonte de verdade para peso (`BodyProgressEntry.weightKg`).
// A Health Data Foundation NÃO duplica peso em sua própria store — em vez
// disso, deriva `HealthDataRecord`s (`source: 'body_progress'`) sob demanda a
// partir das entradas existentes, só para leitura/consulta. Entrada manual de
// peso na UI de Saúde (Parte 2) deve gravar em `body-progress.ts`, nunca aqui.

import { getBodyProgressEntries } from '../body-progress'
import { METRIC_UNITS } from './types'
import type { HealthDataRecord } from './types'

/**
 * Deriva registros de peso a partir de `BodyProgressEntry`. Puro e
 * read-only — nada é persistido nesta store. `recordedAt`/`importedAt` usam
 * o mesmo valor porque Body Progress não distingue os dois conceitos.
 */
export function getWeightRecordsFromBodyProgress(): HealthDataRecord[] {
  return getBodyProgressEntries()
    .filter((entry) => entry.weightKg !== undefined)
    .map((entry) => ({
      id: `body-progress-adapter:${entry.id}`,
      metric: 'weight',
      value: entry.weightKg!,
      unit: METRIC_UNITS.weight,
      recordedAt: `${entry.recordedAt}T12:00:00.000Z`,
      source: 'body_progress',
      externalId: entry.id,
      importedAt: entry.createdAt,
      quality: 'high',
    }))
}
