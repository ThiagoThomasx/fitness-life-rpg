// Importação CSV — Sprint 28 Parte 2. Colunas canônicas:
// metric, value, unit, recordedAt, source, externalId, startAt, endAt.
// Mapeamento básico de cabeçalhos em português é aceito (Data/Métrica/Valor/
// Unidade) — mapeamento avançado (colunas arbitrárias) está fora do escopo.

import { parseCsvText } from './csv-parser'
import { isValidHealthDataSource, isValidHealthMetricType } from './validation'
import type { HealthDataSource, NewHealthDataRecordInput } from './types'
import type { ParsedImportItem } from './import-json'

const CANONICAL_COLUMNS = [
  'metric',
  'value',
  'unit',
  'recordedAt',
  'source',
  'externalId',
  'startAt',
  'endAt',
] as const

type CanonicalColumn = typeof CANONICAL_COLUMNS[number]

/** Aliases aceitos (cabeçalho em português) → nome canônico. Mapeamento avançado está fora do escopo. */
const HEADER_ALIASES: Record<string, CanonicalColumn> = {
  metrica: 'metric',
  valor: 'value',
  unidade: 'unit',
  data: 'recordedAt',
  fonte: 'source',
}

function normalizeHeaderName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function resolveCanonicalColumn(rawHeader: string): CanonicalColumn | null {
  const normalized = normalizeHeaderName(rawHeader)
  const canonicalMatch = CANONICAL_COLUMNS.find((c) => c.toLowerCase() === normalized)
  if (canonicalMatch) return canonicalMatch
  return HEADER_ALIASES[normalized] ?? null
}

export interface ParsedCsvImportFile {
  ok: boolean
  globalError?: string
  items: ParsedImportItem[]
}

function parseCsvRow(
  columnIndex: Partial<Record<CanonicalColumn, number>>,
  cells: string[],
  lineNumber: number
): ParsedImportItem {
  const field = (name: CanonicalColumn): string => {
    const idx = columnIndex[name]
    return idx === undefined ? '' : (cells[idx] ?? '').trim()
  }

  const metric = field('metric')
  if (!isValidHealthMetricType(metric)) {
    return { index: lineNumber, error: 'Coluna "metric" ausente ou desconhecida.' }
  }

  const startAt = field('startAt') || undefined
  const endAt = field('endAt') || undefined
  let recordedAt = field('recordedAt') || undefined

  const rawValue = field('value')
  let value: number
  if (rawValue === '') {
    if (metric === 'sleep_duration' && startAt && endAt) {
      const startMs = new Date(startAt).getTime()
      const endMs = new Date(endAt).getTime()
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return { index: lineNumber, error: 'Colunas "startAt"/"endAt" inválidas para derivar a duração do sono.' }
      }
      value = (endMs - startMs) / 60_000
    } else {
      return { index: lineNumber, error: 'Coluna "value" ausente (ou "startAt"/"endAt" para sono).' }
    }
  } else {
    value = Number(rawValue)
    if (!Number.isFinite(value)) {
      return { index: lineNumber, error: 'Coluna "value" não é um número válido.' }
    }
  }

  if (!recordedAt) {
    recordedAt = endAt ?? startAt
  }
  if (!recordedAt) {
    return { index: lineNumber, error: 'Coluna "recordedAt" ausente.' }
  }

  const rawSource = field('source')
  const source: HealthDataSource = rawSource === '' ? 'csv_import' : (rawSource as HealthDataSource)
  if (rawSource !== '' && !isValidHealthDataSource(source)) {
    return { index: lineNumber, error: `Fonte "${rawSource}" desconhecida.` }
  }

  const unit = field('unit') || undefined
  const externalId = field('externalId') || undefined

  const input: NewHealthDataRecordInput = {
    metric,
    value,
    unit,
    recordedAt,
    startAt,
    endAt,
    source,
    externalId,
  }
  return { index: lineNumber, input }
}

/**
 * Faz o parse de um CSV de importação de dados de saúde. Cada linha de
 * dados é reportada individualmente (`index` = número da linha, 1-based,
 * contando o cabeçalho como linha 1) — uma linha inválida nunca impede as
 * demais.
 */
export function parseHealthDataCsvImport(text: string): ParsedCsvImportFile {
  const { header, rows } = parseCsvText(text)

  if (header.length === 0) {
    return { ok: false, globalError: 'Arquivo CSV vazio.', items: [] }
  }

  const columnIndex: Partial<Record<CanonicalColumn, number>> = {}
  header.forEach((rawHeader, i) => {
    const canonical = resolveCanonicalColumn(rawHeader)
    if (canonical) columnIndex[canonical] = i
  })

  if (columnIndex.metric === undefined) {
    return { ok: false, globalError: 'Cabeçalho inválido: coluna "metric" não encontrada.', items: [] }
  }

  const items = rows.map((cells, i) => parseCsvRow(columnIndex, cells, i + 2))
  return { ok: true, items }
}
