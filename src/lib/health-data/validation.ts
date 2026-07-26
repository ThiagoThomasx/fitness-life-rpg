// Validação por métrica — Sprint 28. Valores fora da faixa plausível ou com
// timestamps inválidos são rejeitados aqui, nunca aceitos silenciosamente.
// Ver `HEALTH-DATA-QUALITY.md` para a tabela de faixas e a justificativa.

import { HEALTH_METRIC_TYPES, METRIC_UNITS } from './types'
import type { HealthDataSource, HealthMetricType, NewHealthDataRecordInput } from './types'

const ALL_HEALTH_DATA_SOURCES: readonly HealthDataSource[] = [
  'manual',
  'workout',
  'body_progress',
  'wellness',
  'json_import',
  'csv_import',
  'health_connect',
  'samsung_health',
  'apple_health',
  'google_fit',
]

export interface MetricRange {
  min: number
  max: number
  integer?: boolean
}

/**
 * Faixas plausíveis por métrica (não clínicas — apenas para rejeitar erros de
 * digitação/importação óbvios, ex.: peso de 3000kg ou FC de 900bpm).
 */
export const METRIC_RANGES: Record<HealthMetricType, MetricRange> = {
  steps: { min: 0, max: 100_000, integer: true },
  sleep_duration: { min: 0, max: 24 * 60 },
  sleep_quality: { min: 1, max: 5, integer: true },
  resting_heart_rate: { min: 20, max: 220 },
  weight: { min: 20, max: 300 },
  active_calories: { min: 0, max: 10_000 },
  activity_duration: { min: 0, max: 24 * 60 },
  distance: { min: 0, max: 500 },
  wellness_energy: { min: 1, max: 5, integer: true },
  wellness_soreness: { min: 1, max: 5, integer: true },
  wellness_motivation: { min: 1, max: 5, integer: true },
}

export function isValidHealthMetricType(value: unknown): value is HealthMetricType {
  return typeof value === 'string' && (HEALTH_METRIC_TYPES as readonly string[]).includes(value)
}

export function isValidHealthDataSource(value: unknown): value is HealthDataSource {
  return typeof value === 'string' && (ALL_HEALTH_DATA_SOURCES as readonly string[]).includes(value)
}

function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  const time = new Date(value).getTime()
  return Number.isFinite(time)
}

export function isValueInRange(metric: HealthMetricType, value: number): boolean {
  const range = METRIC_RANGES[metric]
  if (!Number.isFinite(value)) return false
  if (value < range.min || value > range.max) return false
  if (range.integer && !Number.isInteger(value)) return false
  return true
}

export interface HealthDataValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Valida um input de novo registro antes de normalizar/persistir. Regras
 * transversais (timestamp, faixa de valor) mais as específicas de sono
 * (início antes do fim).
 */
export function validateHealthDataInput(input: NewHealthDataRecordInput): HealthDataValidationResult {
  const errors: string[] = []

  if (!isValidHealthMetricType(input.metric)) {
    errors.push('Métrica desconhecida.')
    return { valid: false, errors }
  }

  if (!isValidHealthDataSource(input.source)) {
    errors.push('Fonte de dados desconhecida.')
  }

  if (!isValueInRange(input.metric, input.value)) {
    const range = METRIC_RANGES[input.metric]
    errors.push(`Valor fora da faixa plausível (${range.min}–${range.max} ${METRIC_UNITS[input.metric]}).`)
  }

  if (!isValidIsoTimestamp(input.recordedAt)) {
    errors.push('Data/hora de registro inválida.')
  }

  if (input.startAt !== undefined || input.endAt !== undefined) {
    if (!isValidIsoTimestamp(input.startAt) || !isValidIsoTimestamp(input.endAt)) {
      errors.push('Início/fim do intervalo inválidos.')
    } else if (new Date(input.startAt!).getTime() >= new Date(input.endAt!).getTime()) {
      errors.push('O início do intervalo deve ser anterior ao fim.')
    }
  }

  if (
    (input.metric === 'sleep_duration') &&
    input.startAt !== undefined &&
    input.endAt !== undefined
  ) {
    const durationMinutes = (new Date(input.endAt).getTime() - new Date(input.startAt).getTime()) / 60_000
    if (Math.abs(durationMinutes - input.value) > 1) {
      errors.push('A duração do sono não corresponde ao intervalo início/fim informado.')
    }
  }

  return { valid: errors.length === 0, errors }
}

/** Valida um `HealthDataRecord` já persistido/importado (formato estrito, todos os campos presentes). */
export function isValidHealthDataRecord(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Record<string, unknown>

  if (typeof r.id !== 'string' || r.id.length === 0) return false
  if (!isValidHealthMetricType(r.metric)) return false
  if (typeof r.value !== 'number' || !isValueInRange(r.metric, r.value)) return false
  if (typeof r.unit !== 'string' || r.unit.length === 0) return false
  if (!isValidIsoTimestamp(r.recordedAt)) return false
  if (r.startAt !== undefined && !isValidIsoTimestamp(r.startAt)) return false
  if (r.endAt !== undefined && !isValidIsoTimestamp(r.endAt)) return false
  if (!isValidHealthDataSource(r.source)) return false
  if (r.externalId !== undefined && typeof r.externalId !== 'string') return false
  if (!isValidIsoTimestamp(r.importedAt)) return false
  if (!['high', 'medium', 'low', 'unknown'].includes(r.quality as string)) return false
  if (r.metadata !== undefined) {
    if (typeof r.metadata !== 'object' || r.metadata === null || Array.isArray(r.metadata)) return false
    for (const value of Object.values(r.metadata as Record<string, unknown>)) {
      if (!['string', 'number', 'boolean'].includes(typeof value)) return false
    }
  }

  return true
}
