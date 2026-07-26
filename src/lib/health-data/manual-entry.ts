// Entrada manual — Sprint 28 Parte 2. Ponto único que a UI de formulário
// deve chamar: decide se o registro vai para `lrpg-fit:health-data-records`
// (storage.ts) ou é redirecionado para Body Progress (peso). A UI nunca deve
// chamar `createHealthDataRecord` diretamente para `metric: 'weight'` — isso
// criaria um segundo histórico de peso, violando a decisão arquitetural da
// Parte 1.

import { createBodyProgressEntry } from '../body-progress'
import { normalizeUnit } from './normalization'
import { createHealthDataRecord } from './storage'
import { validateHealthDataInput } from './validation'
import type { HealthDataQualityLevel, HealthMetricType, NewHealthDataRecordInput } from './types'

export const MAX_HEALTH_IMPORT_FILE_BYTES = 5 * 1024 * 1024

export interface CreateManualHealthRecordResult {
  ok: boolean
  metric: HealthMetricType
  value?: number
  unit?: string
  quality?: HealthDataQualityLevel
  /** `true` quando o registro foi salvo em Body Progress em vez de `health-data-records`. */
  redirectedToBodyProgress?: boolean
  errors?: string[]
}

function toDateOnly(recordedAt: string): string {
  return recordedAt.slice(0, 10)
}

function createManualWeightRecord(input: NewHealthDataRecordInput): CreateManualHealthRecordResult {
  const validation = validateHealthDataInput(input)
  if (!validation.valid) {
    return { ok: false, metric: 'weight', errors: validation.errors }
  }

  const normalized = normalizeUnit('weight', input.value, input.unit)
  if (!normalized) {
    return { ok: false, metric: 'weight', errors: [`Unidade "${input.unit}" não suportada para peso.`] }
  }

  const result = createBodyProgressEntry({ recordedAt: toDateOnly(input.recordedAt), weightKg: normalized.value })
  if (!result.ok) {
    return { ok: false, metric: 'weight', errors: [result.error ?? 'Falha ao salvar o peso.'] }
  }

  return {
    ok: true,
    metric: 'weight',
    value: normalized.value,
    unit: normalized.unit,
    quality: 'high',
    redirectedToBodyProgress: true,
  }
}

/**
 * Cria um registro de entrada manual. Para `weight`, delega a
 * `createBodyProgressEntry` (fonte de verdade única) em vez de persistir em
 * `health-data-records` — para as demais métricas, usa `createHealthDataRecord`
 * normalmente (validação/normalização/qualidade/deduplicação da Parte 1).
 */
export function createManualHealthRecord(input: NewHealthDataRecordInput): CreateManualHealthRecordResult {
  if (input.metric === 'weight') {
    return createManualWeightRecord(input)
  }

  const result = createHealthDataRecord(input)
  if (!result.ok) {
    return {
      ok: false,
      metric: input.metric,
      errors: result.errors ?? (result.duplicate ? ['Este registro já existe (duplicado).'] : ['Falha ao salvar.']),
    }
  }

  return {
    ok: true,
    metric: input.metric,
    value: result.record!.value,
    unit: result.record!.unit,
    quality: result.record!.quality,
  }
}
