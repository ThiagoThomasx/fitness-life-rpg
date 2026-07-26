// Import Mapping — Sprint 30 Parte 1. Modelo de mapeamento explícito para
// arquivos CSV não canônicos: o usuário decide qual coluna do arquivo vira
// qual campo interno, nunca o sistema infere e importa silenciosamente.
// Reaproveita `NewHealthDataRecordInput`/`HealthMetricType` do domínio já
// existente — este subdomínio só produz esse input, nunca reimplementa
// validação/normalização/qualidade (ver `HEALTH-DATA-FOUNDATION.md`).

import type { HealthDataSource, HealthMetricType } from '../types'

/** Campos internos para os quais uma coluna do arquivo (ou um valor fixo) pode ser mapeada. */
export type HealthImportTargetField =
  | 'metric'
  | 'value'
  | 'unit'
  | 'recordedAt'
  | 'startAt'
  | 'endAt'
  | 'source'
  | 'externalId'
  | 'timeColumn' // combinado com recordedAt/startAt via transformação `combine_date_time`

export const HEALTH_IMPORT_TARGET_FIELDS: readonly HealthImportTargetField[] = [
  'metric',
  'value',
  'unit',
  'recordedAt',
  'startAt',
  'endAt',
  'source',
  'externalId',
  'timeColumn',
]

/** Campos que todo mapeamento precisa resolver (por coluna OU por valor fixo) antes do preview. */
export const REQUIRED_TARGET_FIELDS: readonly HealthImportTargetField[] = ['metric', 'value', 'recordedAt']

export type HealthImportDecimalSeparator = '.' | ','
export type HealthImportDelimiter = ',' | ';' | '\t'

/** Formatos de data suportados — nunca inferidos automaticamente quando ambíguos (ver `detection.ts`). */
export type HealthImportDateFormat =
  | 'ISO'
  | 'YYYY-MM-DD'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY/MM/DD'
  | 'DD/MM/YYYY HH:mm'
  | 'YYYY-MM-DD HH:mm:ss'

export const HEALTH_IMPORT_DATE_FORMATS: readonly HealthImportDateFormat[] = [
  'ISO',
  'YYYY-MM-DD',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'DD-MM-YYYY',
  'YYYY/MM/DD',
  'DD/MM/YYYY HH:mm',
  'YYYY-MM-DD HH:mm:ss',
]

// ─── Transformações (seção 16) ─────────────────────────────────────────────
// Apenas transformações seguras e determinísticas — nunca uma linguagem de
// script, nunca execução de código arbitrário.

export interface TrimTransformation {
  kind: 'trim'
}
export interface LowercaseTransformation {
  kind: 'lowercase'
}
export interface UppercaseTransformation {
  kind: 'uppercase'
}
export interface ReplaceTransformation {
  kind: 'replace'
  search: string
  replacement: string
}
export interface ParseNumberTransformation {
  kind: 'parse_number'
  decimalSeparator: HealthImportDecimalSeparator
  thousandSeparator?: string
}
export interface ParseDateTransformation {
  kind: 'parse_date'
  format: HealthImportDateFormat
  timezone?: string
}
export interface UnitConversionTransformation {
  kind: 'unit_conversion'
  fromUnit: string
}
export interface MapValueTransformation {
  kind: 'map_value'
  /** Chave = valor textual original (após trim), valor = número mapeado. */
  valueMap: Record<string, number>
}
export interface CombineDateTimeTransformation {
  kind: 'combine_date_time'
  dateFormat: HealthImportDateFormat
}
export interface DeriveSleepDurationTransformation {
  kind: 'derive_sleep_duration'
}

export type HealthImportTransformation =
  | TrimTransformation
  | LowercaseTransformation
  | UppercaseTransformation
  | ReplaceTransformation
  | ParseNumberTransformation
  | ParseDateTransformation
  | UnitConversionTransformation
  | MapValueTransformation
  | CombineDateTimeTransformation
  | DeriveSleepDurationTransformation

/** Transformação associada a um campo alvo específico do mapeamento. */
export interface HealthImportFieldTransformation {
  field: HealthImportTargetField
  transformation: HealthImportTransformation
}

// ─── Mapeamento (seção 7) ───────────────────────────────────────────────────

export type HealthImportSourceFormat = 'csv' | 'json'

/** Uma coluna do arquivo mapeada para um campo interno. */
export type HealthImportColumnMapping = Partial<Record<HealthImportTargetField, string>>

/** Um valor fixo (sem coluna correspondente no arquivo) para um campo interno. */
export interface HealthImportStaticValues {
  metric?: HealthMetricType
  unit?: string
  source?: HealthDataSource
}

export interface HealthImportMapping {
  id: string
  name: string

  sourceFormat: HealthImportSourceFormat

  /** Coluna do arquivo → campo interno. Duas entradas nunca apontam para o mesmo campo. */
  columns: HealthImportColumnMapping

  static: HealthImportStaticValues

  dateFormat?: HealthImportDateFormat
  decimalSeparator: HealthImportDecimalSeparator
  delimiter: HealthImportDelimiter

  transformations: HealthImportFieldTransformation[]

  createdAt: string
  updatedAt: string
}

export type NewHealthImportMappingInput = Omit<HealthImportMapping, 'id' | 'createdAt' | 'updatedAt'>

// ─── Detecção assistida (seções 10, 11, 20) ────────────────────────────────

export interface HealthImportFile {
  name: string
  kind: HealthImportSourceFormat
  header: string[]
  /** Amostra de linhas (não o arquivo inteiro) usada só para heurísticas de detecção. */
  sampleRows: string[][]
}

export type HealthImportDetectionConfidence = 'high' | 'medium' | 'low'

export interface HealthImportColumnSuggestion {
  column: string
  field: HealthImportTargetField
  confidence: HealthImportDetectionConfidence
}

export interface HealthImportMetricSuggestion {
  metric: HealthMetricType
  confidence: HealthImportDetectionConfidence
  evidence: string
}

export interface HealthImportDetectionResult {
  columnSuggestions: HealthImportColumnSuggestion[]
  metricSuggestion: HealthImportMetricSuggestion | null
  presetSuggestions: string[] // ids de presets compatíveis, nunca aplicados automaticamente
}

// ─── Validação de mapeamento (seção 24) ────────────────────────────────────

export interface HealthImportMappingError {
  field: HealthImportTargetField | 'general'
  reason: string
}

export interface HealthImportMappingValidation {
  valid: boolean
  errors: HealthImportMappingError[]
}
