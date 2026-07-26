// Health Data Foundation — Sprint 28.
// Camada local, agnóstica de fonte, para sinais de saúde (sono, passos, peso,
// FC de repouso, calorias, atividade, bem-estar). Não recalcula nem duplica
// métricas de Readiness/Recovery/Fatigue/Coach — apenas fornece registros
// normalizados que esses motores podem consumir. Sem diagnóstico ou
// prescrição médica. Ver `HEALTH-DATA-FOUNDATION.md`.

/**
 * De onde um registro de saúde veio. As fontes de plataforma externa
 * (`health_connect`, `samsung_health`, `apple_health`, `google_fit`) são
 * apenas preparadas no tipo — nenhuma integração real nesta sprint.
 */
export type HealthDataSource =
  | 'manual'
  | 'workout'
  | 'body_progress'
  | 'wellness'
  | 'json_import'
  | 'csv_import'
  | 'health_connect'
  | 'samsung_health'
  | 'apple_health'
  | 'google_fit'

/** Fontes ativas nesta sprint — usado para validar entrada, não para consulta. */
export const ACTIVE_HEALTH_DATA_SOURCES: readonly HealthDataSource[] = [
  'manual',
  'workout',
  'body_progress',
  'wellness',
  'json_import',
  'csv_import',
]

export type HealthMetricType =
  | 'steps'
  | 'sleep_duration'
  | 'sleep_quality'
  | 'resting_heart_rate'
  | 'weight'
  | 'active_calories'
  | 'activity_duration'
  | 'distance'
  | 'wellness_energy'
  | 'wellness_soreness'
  | 'wellness_motivation'

export const HEALTH_METRIC_TYPES: readonly HealthMetricType[] = [
  'steps',
  'sleep_duration',
  'sleep_quality',
  'resting_heart_rate',
  'weight',
  'active_calories',
  'activity_duration',
  'distance',
  'wellness_energy',
  'wellness_soreness',
  'wellness_motivation',
]

/** Unidade canônica interna por métrica — conversão só acontece na normalização. */
export const METRIC_UNITS: Record<HealthMetricType, string> = {
  steps: 'count',
  sleep_duration: 'minutes',
  sleep_quality: 'score',
  resting_heart_rate: 'bpm',
  weight: 'kg',
  active_calories: 'kcal',
  activity_duration: 'minutes',
  distance: 'km',
  wellness_energy: 'score',
  wellness_soreness: 'score',
  wellness_motivation: 'score',
}

export type HealthDataQualityLevel = 'high' | 'medium' | 'low' | 'unknown'

export interface HealthDataQuality {
  level: HealthDataQualityLevel
  reasons: string[]
}

export interface HealthDataRecord {
  id: string

  metric: HealthMetricType
  value: number
  unit: string

  /** Timestamp ISO do momento em que o dado se refere (não de importação). */
  recordedAt: string
  /** Início/fim do intervalo, quando aplicável (ex.: sono, atividade). */
  startAt?: string
  endAt?: string

  source: HealthDataSource
  /** Identificador na fonte externa, quando existir (ex.: id do Health Connect). */
  externalId?: string

  importedAt: string

  quality: HealthDataQualityLevel

  metadata?: Record<string, string | number | boolean>
}

export interface NewHealthDataRecordInput {
  metric: HealthMetricType
  value: number
  unit?: string
  recordedAt: string
  startAt?: string
  endAt?: string
  source: HealthDataSource
  externalId?: string
  metadata?: Record<string, string | number | boolean>
}

export type HealthConflictSeverity = 'low' | 'medium' | 'high'

export interface HealthDataConflict {
  metric: HealthMetricType
  date: string
  recordIds: string[]
  sources: HealthDataSource[]
  reason: string
  severity: HealthConflictSeverity
}

export interface HealthMetricBaseline {
  metric: HealthMetricType
  periodDays: number
  value: number
  median: number
  standardDeviation: number
  sampleSize: number
  quality: HealthDataQuality
}

// ─── Agregação diária, conflitos, baseline e tendências (Sprint 28 Parte 3) ───

/**
 * Resumo de um único dia, derivado sob demanda de `HealthDataRecord[]` — nunca
 * persistido (ver `aggregation.ts`). Um campo de métrica é `undefined` quando
 * nenhum registro válido daquela métrica existe naquele dia.
 */
export interface DailyHealthSummary {
  /** `YYYY-MM-DD`, sempre em UTC (mesmo recorte usado pela deduplicação de peso). */
  date: string

  steps?: number
  sleepMinutes?: number
  sleepQuality?: number
  restingHeartRate?: number
  weightKg?: number
  activeCalories?: number
  activityMinutes?: number
  distanceKm?: number
  wellnessEnergy?: number
  wellnessSoreness?: number
  wellnessMotivation?: number

  /** Fontes que contribuíram para qualquer métrica do dia. */
  sources: HealthDataSource[]
  quality: HealthDataQuality
  conflicts: HealthDataConflict[]
}

export type HealthTrendDirection = 'increasing' | 'stable' | 'decreasing' | 'irregular' | 'insufficient_data'

export interface HealthMetricTrend {
  metric: HealthMetricType
  periodDays: number
  direction: HealthTrendDirection
  sampleSize: number
  windowedAverage: number | null
  /** Variação absoluta estimada ao longo da janela recente (unidade canônica da métrica). */
  changeAbsolute: number | null
  evidence: string
}

// ─── Importação (Sprint 28 Parte 2) ────────────────────────────────────────────

export type HealthImportFileKind = 'json' | 'csv'

/** Um registro do arquivo que não pôde ser interpretado/validado. */
export interface HealthImportError {
  /** Índice do registro no JSON, ou número da linha (1-based, contando o cabeçalho) no CSV. */
  index: number
  reason: string
  raw?: unknown
}

/** Um registro válido, mas que já existe (ou se repete dentro do próprio arquivo). */
export interface HealthImportDuplicate {
  record: HealthDataRecord
  reason: string
}

export interface HealthImportQualityBreakdown {
  high: number
  medium: number
  low: number
  unknown: number
}

/**
 * Modelo puro de prévia — nunca persiste nada. `validRecords` já são
 * `HealthDataRecord`s completos (validados, normalizados, com qualidade
 * calculada) prontos para persistência caso o usuário confirme.
 */
export interface HealthImportPreview {
  fileKind: HealthImportFileKind
  total: number
  valid: number
  invalid: number
  duplicates: number
  readyToImport: number

  validRecords: HealthDataRecord[]
  duplicateRecords: HealthImportDuplicate[]
  invalidRecords: HealthImportError[]

  qualityBreakdown: HealthImportQualityBreakdown
}
