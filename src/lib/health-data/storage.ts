// Persistência — Sprint 28. Segue o mesmo padrão de `body-progress.ts` e
// `readiness-check-ins.ts`: array em uma única chave de `localStorage`. Não
// usa IndexedDB — volume esperado (poucos registros por dia por métrica) é
// pequeno comparado às fotos de Body Progress, único domínio que já precisa
// de IndexedDB no projeto (ver auditoria da Sprint 28 em `HEALTH-DATA-FOUNDATION.md`).

import { deduplicateRecords } from './deduplication'
import { isValidHealthDataRecord, validateHealthDataInput } from './validation'
import type { HealthDataRecord, HealthMetricType, NewHealthDataRecordInput } from './types'
import { computeRecordQuality } from './quality'
import { normalizeUnit, buildHealthDataRecord } from './normalization'

export const HEALTH_DATA_RECORDS_KEY = 'lrpg-fit:health-data-records'

function loadRecords(): HealthDataRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HEALTH_DATA_RECORDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidHealthDataRecord) as HealthDataRecord[]
  } catch {
    return []
  }
}

function persistRecords(records: HealthDataRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HEALTH_DATA_RECORDS_KEY, JSON.stringify(records))
  } catch {
    // Storage indisponível ou cheio — falha silenciosa, consistente com o
    // restante do projeto (ver `body-progress.ts`).
  }
}

export function getHealthDataRecords(): HealthDataRecord[] {
  return [...loadRecords()].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export function getHealthDataRecordById(id: string): HealthDataRecord | null {
  return loadRecords().find((r) => r.id === id) ?? null
}

export interface CreateHealthDataRecordResult {
  ok: boolean
  record?: HealthDataRecord
  errors?: string[]
  duplicate?: boolean
}

/**
 * Cria um registro a partir de um input de entrada manual ou de uma única
 * fonte já pré-validada. Fluxo: validar → normalizar unidade → calcular
 * qualidade → deduplicar → persistir. Rejeita silenciosamente nunca —
 * sempre retorna o motivo.
 */
export function createHealthDataRecord(input: NewHealthDataRecordInput): CreateHealthDataRecordResult {
  const validation = validateHealthDataInput(input)
  if (!validation.valid) {
    return { ok: false, errors: validation.errors }
  }

  const normalized = normalizeUnit(input.metric, input.value, input.unit)
  if (!normalized) {
    return { ok: false, errors: [`Unidade "${input.unit}" não suportada para esta métrica.`] }
  }

  const quality = computeRecordQuality(input)
  const record = buildHealthDataRecord(input, normalized, quality.level)

  const existing = loadRecords()
  const { unique, duplicates } = deduplicateRecords(existing, [record])

  if (unique.length === 0) {
    return { ok: false, duplicate: true, errors: ['Este registro já existe (duplicado).'] }
  }

  persistRecords([...existing, ...unique])
  return { ok: true, record: unique[0], duplicate: duplicates.length > 0 }
}

export function deleteHealthDataRecord(id: string): boolean {
  const existing = loadRecords()
  const next = existing.filter((r) => r.id !== id)
  if (next.length === existing.length) return false
  persistRecords(next)
  return true
}

/**
 * Reset granular (Sprint 28 Parte 4) — remove só os registros de saúde
 * (`HEALTH_DATA_RECORDS_KEY`). Nunca apaga treinos, Readiness subjetivo nem
 * Body Progress: peso é sempre lido de `lrpg-fit:body-progress` sob demanda
 * (ver `body-progress-adapter.ts`), nunca duplicado aqui — por isso não há
 * nada de Body Progress para preservar ou apagar neste reset. Daily
 * summaries/baselines/tendências/conflitos nunca são persistidos (sempre
 * derivados sob demanda — ver `analytics-queries.ts`), então também não há
 * cache derivado para invalidar.
 */
export function resetHealthData(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(HEALTH_DATA_RECORDS_KEY)
}

export interface ImportHealthDataRecordsResult {
  imported: number
  duplicates: number
  invalid: number
}

/**
 * Importa registros já normalizados/validados (usado pelos fluxos de
 * importação JSON/CSV da Parte 2 e pelo restore de backup da Parte 4).
 * Registros inválidos são contados e descartados, nunca aceitos.
 */
export function importHealthDataRecords(raw: unknown[]): ImportHealthDataRecordsResult {
  if (!Array.isArray(raw)) return { imported: 0, duplicates: 0, invalid: 0 }

  const valid: HealthDataRecord[] = []
  let invalid = 0
  for (const item of raw) {
    if (isValidHealthDataRecord(item)) {
      valid.push(item as HealthDataRecord)
    } else {
      invalid++
    }
  }

  const existing = loadRecords()
  const { unique, duplicates } = deduplicateRecords(existing, valid)

  if (unique.length > 0) {
    persistRecords([...existing, ...unique])
  }

  return { imported: unique.length, duplicates: duplicates.length, invalid }
}

export function getHealthDataRecordsByMetric(metric: HealthMetricType): HealthDataRecord[] {
  return getHealthDataRecords().filter((r) => r.metric === metric)
}
