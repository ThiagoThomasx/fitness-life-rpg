// Aplicação atômica da importação — Sprint 28 Parte 2. Reaproveita a
// estratégia de snapshot + rollback já testada em `backup.ts`, adaptada às
// duas chaves envolvidas: `lrpg-fit:health-data-records` (a maioria das
// métricas) e `lrpg-fit:body-progress` (peso — ver decisão arquitetural de
// não duplicar peso, `HEALTH-DATA-FOUNDATION.md`).

import { BODY_PROGRESS_KEY, createBodyProgressEntry } from '../body-progress'
import { HEALTH_DATA_RECORDS_KEY, importHealthDataRecords } from './storage'
import type { HealthDataRecord } from './types'

export interface ApplyImportResult {
  ok: boolean
  appliedCount: number
  error?: string
}

function snapshotKeys(keys: string[]): Map<string, string | null> {
  const snapshot = new Map<string, string | null>()
  for (const key of keys) snapshot.set(key, window.localStorage.getItem(key))
  return snapshot
}

function restoreSnapshot(snapshot: Map<string, string | null>): void {
  snapshot.forEach((raw, key) => {
    if (raw === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, raw)
  })
}

/**
 * Aplica os registros já prontos de uma prévia (`HealthImportPreview.validRecords`),
 * atomicamente. Peso é redirecionado para `createBodyProgressEntry` — nunca
 * persistido em `lrpg-fit:health-data-records` — as demais métricas seguem
 * para `importHealthDataRecords`. Qualquer falha reverte as duas chaves ao
 * estado anterior; nenhum registro parcial fica persistido.
 */
export function applyHealthImportRecords(records: HealthDataRecord[]): ApplyImportResult {
  if (records.length === 0) return { ok: true, appliedCount: 0 }
  if (typeof window === 'undefined') return { ok: false, appliedCount: 0, error: 'Armazenamento indisponível.' }

  const weightRecords = records.filter((r) => r.metric === 'weight')
  const otherRecords = records.filter((r) => r.metric !== 'weight')

  const snapshot = snapshotKeys([HEALTH_DATA_RECORDS_KEY, BODY_PROGRESS_KEY])

  try {
    let applied = 0

    if (otherRecords.length > 0) {
      const result = importHealthDataRecords(otherRecords)
      applied += result.imported
    }

    for (const weightRecord of weightRecords) {
      const dateOnly = weightRecord.recordedAt.slice(0, 10)
      const result = createBodyProgressEntry({ recordedAt: dateOnly, weightKg: weightRecord.value })
      if (!result.ok) {
        throw new Error(result.error ?? 'Falha ao salvar peso em Progresso Corporal.')
      }
      applied++
    }

    return { ok: true, appliedCount: applied }
  } catch (error) {
    restoreSnapshot(snapshot)
    return {
      ok: false,
      appliedCount: 0,
      error: error instanceof Error ? error.message : 'Falha ao aplicar a importação. Nenhum dado foi alterado.',
    }
  }
}
