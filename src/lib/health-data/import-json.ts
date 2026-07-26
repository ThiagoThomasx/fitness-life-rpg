// Importação JSON — Sprint 28 Parte 2. Aceita SOMENTE o schema canônico
// documentado em `HEALTH-DATA-IMPORT.md` — nunca objetos arbitrários. Erros
// globais (JSON inválido, versão não suportada, `records` ausente) bloqueiam
// toda a prévia; erros por registro (`ParsedImportItem.error`) só descartam
// aquele registro, sem impedir os demais.

import { isValidHealthDataSource, isValidHealthMetricType } from './validation'
import type { HealthDataSource, NewHealthDataRecordInput } from './types'

export const HEALTH_DATA_JSON_VERSION = 1

export interface ParsedImportItem {
  index: number
  input?: NewHealthDataRecordInput
  error?: string
}

export interface ParsedImportFile {
  ok: boolean
  globalError?: string
  items: ParsedImportItem[]
}

function parseJsonRecord(raw: unknown, index: number): ParsedImportItem {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { index, error: 'Registro não é um objeto.' }
  }
  const r = raw as Record<string, unknown>

  if (!isValidHealthMetricType(r.metric)) {
    return { index, error: 'Campo "metric" ausente ou desconhecido.' }
  }
  if (typeof r.value !== 'number' || !Number.isFinite(r.value)) {
    return { index, error: 'Campo "value" ausente ou não numérico.' }
  }
  if (typeof r.recordedAt !== 'string' || r.recordedAt.length === 0) {
    return { index, error: 'Campo "recordedAt" ausente ou inválido.' }
  }

  const source: HealthDataSource = isValidHealthDataSource(r.source) ? r.source : 'json_import'
  if (r.source !== undefined && !isValidHealthDataSource(r.source)) {
    return { index, error: `Fonte "${String(r.source)}" desconhecida.` }
  }

  const input: NewHealthDataRecordInput = {
    metric: r.metric,
    value: r.value,
    unit: typeof r.unit === 'string' ? r.unit : undefined,
    recordedAt: r.recordedAt,
    startAt: typeof r.startAt === 'string' ? r.startAt : undefined,
    endAt: typeof r.endAt === 'string' ? r.endAt : undefined,
    source,
    externalId: typeof r.externalId === 'string' ? r.externalId : undefined,
  }
  return { index, input }
}

/**
 * Parseia o arquivo JSON canônico `{ version, records }`. Só rejeita
 * globalmente por problemas estruturais do envelope — cada item de
 * `records` é reportado individualmente, nunca descartado em silêncio.
 */
export function parseHealthDataJsonImport(text: string): ParsedImportFile {
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    return { ok: false, globalError: 'Arquivo JSON inválido ou corrompido.', items: [] }
  }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, globalError: 'O arquivo não contém um objeto JSON válido.', items: [] }
  }

  const root = payload as Record<string, unknown>

  if (typeof root.version !== 'number') {
    return { ok: false, globalError: 'Campo "version" ausente ou inválido.', items: [] }
  }
  if (root.version > HEALTH_DATA_JSON_VERSION) {
    return {
      ok: false,
      globalError: `Versão do arquivo (${root.version}) não é suportada (máximo ${HEALTH_DATA_JSON_VERSION}).`,
      items: [],
    }
  }

  if (!Array.isArray(root.records)) {
    return { ok: false, globalError: 'Campo "records" ausente ou não é uma lista.', items: [] }
  }

  if (root.records.length === 0) {
    return { ok: true, items: [] }
  }

  return { ok: true, items: root.records.map((raw, index) => parseJsonRecord(raw, index)) }
}
