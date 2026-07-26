// Motor de mapeamento — Sprint 30 Parte 1. Aplica um `HealthImportMapping` a
// linhas de CSV já parseadas (`csv-parser.ts`) e produz `ParsedImportItem[]`
// — o mesmo formato usado por `import-json.ts`/`import-csv.ts` — para que
// `import-preview.ts` seja reaproveitado sem nenhuma alteração.

import { isValidHealthDataSource, isValidHealthMetricType } from '../validation'
import type { HealthDataSource, NewHealthDataRecordInput } from '../types'
import type { ParsedImportItem } from '../import-json'
import { applyTransformationChain } from './transformations'
import { parseDateWithFormat } from './helpers'
import {
  REQUIRED_TARGET_FIELDS,
  type HealthImportFieldTransformation,
  type HealthImportMapping,
  type HealthImportMappingError,
  type HealthImportMappingValidation,
  type HealthImportTargetField,
} from './types'

/**
 * Valida a estrutura do mapeamento em si (não os dados do arquivo): campos
 * obrigatórios resolvidos e nenhuma coluna reaproveitada em dois campos
 * (seção 8, 24).
 */
export function validateMapping(mapping: HealthImportMapping): HealthImportMappingValidation {
  const errors: HealthImportMappingError[] = []

  for (const field of REQUIRED_TARGET_FIELDS) {
    if (field === 'recordedAt') {
      const resolvable = mapping.columns.recordedAt !== undefined || mapping.columns.startAt !== undefined || mapping.columns.endAt !== undefined
      if (!resolvable) {
        errors.push({ field, reason: 'Campo obrigatório "recordedAt" não está mapeado (ou derivável de "startAt"/"endAt").' })
      }
      continue
    }

    const hasColumn = mapping.columns[field] !== undefined
    const hasStatic = field === 'metric' && mapping.static.metric !== undefined
    if (!hasColumn && !hasStatic) {
      errors.push({ field, reason: `Campo obrigatório "${field}" não está mapeado a nenhuma coluna nem valor fixo.` })
    }
  }

  const columnUsage = new Map<string, HealthImportTargetField[]>()
  for (const [field, column] of Object.entries(mapping.columns) as [HealthImportTargetField, string | undefined][]) {
    if (!column) continue
    const fields = columnUsage.get(column) ?? []
    fields.push(field)
    columnUsage.set(column, fields)
  }
  for (const [column, fields] of Array.from(columnUsage.entries())) {
    if (fields.length > 1) {
      errors.push({ field: 'general', reason: `A coluna "${column}" está mapeada para mais de um campo (${fields.join(', ')}).` })
    }
  }

  if (mapping.columns.value === undefined && mapping.columns.startAt === undefined) {
    errors.push({ field: 'value', reason: 'É preciso mapear a coluna "value" ou "startAt"/"endAt" para derivar a duração do sono.' })
  }

  return { valid: errors.length === 0, errors }
}

function transformationsForField(mapping: HealthImportMapping, field: HealthImportTargetField): HealthImportFieldTransformation['transformation'][] {
  return mapping.transformations.filter((t) => t.field === field).map((t) => t.transformation)
}

function extractField(
  mapping: HealthImportMapping,
  header: string[],
  cells: string[],
  field: HealthImportTargetField
): { value: string; error?: string } {
  const columnName = mapping.columns[field]
  if (!columnName) return { value: '' }

  const columnIndex = header.indexOf(columnName)
  if (columnIndex === -1) return { value: '', error: `Coluna "${columnName}" não encontrada no arquivo.` }

  const raw = (cells[columnIndex] ?? '').trim()
  if (raw === '') return { value: '' }

  const transformations = transformationsForField(mapping, field)
  const result = applyTransformationChain(raw, transformations)
  return { value: result.value, error: result.error }
}

function resolveRecordedAt(mapping: HealthImportMapping, header: string[], cells: string[]): { value?: string; error?: string } {
  const recordedAtField = extractField(mapping, header, cells, 'recordedAt')
  if (recordedAtField.error) return { error: recordedAtField.error }
  if (recordedAtField.value === '') return {}

  const hasDateTransformation = transformationsForField(mapping, 'recordedAt').some((t) => t.kind === 'parse_date')
  if (hasDateTransformation) return { value: recordedAtField.value }

  if (mapping.dateFormat && mapping.dateFormat !== 'ISO') {
    const parsed = parseDateWithFormat(recordedAtField.value, mapping.dateFormat, mapping.timezoneOffsetMinutes ?? 0)
    if (!parsed) return { error: `Não foi possível interpretar "${recordedAtField.value}" como data no formato ${mapping.dateFormat}.` }
    return { value: parsed }
  }

  const time = new Date(recordedAtField.value).getTime()
  if (!Number.isFinite(time)) return { error: `Data "${recordedAtField.value}" inválida.` }
  return { value: new Date(time).toISOString() }
}

/**
 * Aplica o mapeamento a uma única linha de dados, produzindo um
 * `ParsedImportItem` — mesma forma usada pelos parsers canônicos, de modo
 * que `import-preview.ts` valida/normaliza/deduplica sem nenhuma mudança.
 */
export function applyMappingToRow(
  mapping: HealthImportMapping,
  header: string[],
  cells: string[],
  lineNumber: number
): ParsedImportItem {
  const metricField = extractField(mapping, header, cells, 'metric')
  if (metricField.error) return { index: lineNumber, error: metricField.error }
  const metric = metricField.value || mapping.static.metric
  if (!isValidHealthMetricType(metric)) {
    return { index: lineNumber, error: `Métrica "${metric}" ausente ou desconhecida.` }
  }

  const startAtField = extractField(mapping, header, cells, 'startAt')
  if (startAtField.error) return { index: lineNumber, error: startAtField.error }
  const endAtField = extractField(mapping, header, cells, 'endAt')
  if (endAtField.error) return { index: lineNumber, error: endAtField.error }

  const recordedAtResult = resolveRecordedAt(mapping, header, cells)
  if (recordedAtResult.error) return { index: lineNumber, error: recordedAtResult.error }

  const valueField = extractField(mapping, header, cells, 'value')
  if (valueField.error) return { index: lineNumber, error: valueField.error }

  const derivesSleepDuration = mapping.transformations.some((t) => t.field === 'value' && t.transformation.kind === 'derive_sleep_duration')
  let value: number
  if (valueField.value !== '') {
    value = Number(valueField.value)
    if (!Number.isFinite(value)) return { index: lineNumber, error: `Valor "${valueField.value}" não é um número válido.` }
  } else if (derivesSleepDuration && startAtField.value && endAtField.value) {
    const startMs = new Date(startAtField.value).getTime()
    const endMs = new Date(endAtField.value).getTime()
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return { index: lineNumber, error: 'Colunas "startAt"/"endAt" inválidas para derivar a duração do sono.' }
    }
    value = (endMs - startMs) / 60_000
  } else {
    return { index: lineNumber, error: 'Coluna "value" ausente e não foi possível derivá-la.' }
  }

  const recordedAt = recordedAtResult.value ?? endAtField.value ?? startAtField.value
  if (!recordedAt) return { index: lineNumber, error: 'Não foi possível resolver a data do registro (recordedAt).' }

  const sourceField = extractField(mapping, header, cells, 'source')
  if (sourceField.error) return { index: lineNumber, error: sourceField.error }
  const source: HealthDataSource = (sourceField.value || mapping.static.source || 'csv_import') as HealthDataSource
  if (!isValidHealthDataSource(source)) return { index: lineNumber, error: `Fonte "${source}" desconhecida.` }

  const unitField = extractField(mapping, header, cells, 'unit')
  if (unitField.error) return { index: lineNumber, error: unitField.error }
  const unit = unitField.value || mapping.static.unit || undefined

  const externalIdField = extractField(mapping, header, cells, 'externalId')
  if (externalIdField.error) return { index: lineNumber, error: externalIdField.error }

  const input: NewHealthDataRecordInput = {
    metric,
    value,
    unit,
    recordedAt,
    startAt: startAtField.value || undefined,
    endAt: endAtField.value || undefined,
    source,
    externalId: externalIdField.value || undefined,
  }

  return { index: lineNumber, input }
}

export interface MappingRowTraceEntry {
  field: HealthImportTargetField
  column: string
  original: string
  transformed: string
  error?: string
}

const TRACE_FIELDS: readonly HealthImportTargetField[] = ['metric', 'value', 'unit', 'recordedAt', 'startAt', 'endAt', 'source', 'externalId']

/**
 * Explica, coluna a coluna, o que a linha vira depois do mapeamento e das
 * transformações — usado pela UI para mostrar "original → transformado"
 * antes da confirmação (seção 19), sem reimplementar nenhuma regra: chama
 * exatamente as mesmas funções que `applyMappingToRow` usa.
 */
export function buildMappingRowTrace(mapping: HealthImportMapping, header: string[], cells: string[]): MappingRowTraceEntry[] {
  const entries: MappingRowTraceEntry[] = []

  for (const field of TRACE_FIELDS) {
    const columnName = mapping.columns[field]
    if (!columnName) continue

    const columnIndex = header.indexOf(columnName)
    const original = columnIndex === -1 ? '' : (cells[columnIndex] ?? '').trim()

    if (field === 'recordedAt') {
      const resolved = resolveRecordedAt(mapping, header, cells)
      entries.push({ field, column: columnName, original, transformed: resolved.value ?? '', error: resolved.error })
      continue
    }

    const result = extractField(mapping, header, cells, field)
    entries.push({ field, column: columnName, original, transformed: result.value, error: result.error })
  }

  return entries
}

export interface MappedCsvImportResult {
  ok: boolean
  globalError?: string
  items: ParsedImportItem[]
}

/** Aplica o mapeamento a todas as linhas de um CSV já parseado (`parseCsvText`). */
export function applyMappingToCsv(mapping: HealthImportMapping, header: string[], rows: string[][]): MappedCsvImportResult {
  const validation = validateMapping(mapping)
  if (!validation.valid) {
    return { ok: false, globalError: validation.errors.map((e) => e.reason).join(' '), items: [] }
  }

  const items = rows.map((cells, i) => applyMappingToRow(mapping, header, cells, i + 2))
  return { ok: true, items }
}
