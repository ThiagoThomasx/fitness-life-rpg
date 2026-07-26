// Detecção assistida — Sprint 30 Parte 1 (seções 10, 11, 20). Só sugere,
// nunca confirma automaticamente. Determinística e testável — nenhuma
// heurística probabilística, nenhuma IA.

import { HEALTH_METRIC_TYPES } from '../types'
import type { HealthMetricType } from '../types'
import type {
  HealthImportColumnSuggestion,
  HealthImportDetectionConfidence,
  HealthImportDetectionResult,
  HealthImportFile,
  HealthImportMapping,
  HealthImportMetricSuggestion,
  HealthImportTargetField,
} from './types'

function normalizeToken(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '_')
}

/** Aliases → campo interno. Cada entrada é um token já normalizado (`normalizeToken`). */
const COLUMN_ALIASES: Record<HealthImportTargetField, readonly string[]> = {
  metric: ['metric', 'metrica', 'tipo', 'type'],
  value: ['value', 'valor', 'amount', 'quantidade'],
  unit: ['unit', 'unidade'],
  recordedAt: ['date', 'data', 'day', 'timestamp', 'recorded_at', 'datetime', 'dia'],
  startAt: ['start', 'start_at', 'inicio', 'start_time'],
  endAt: ['end', 'end_at', 'fim', 'end_time'],
  source: ['source', 'fonte', 'origem'],
  externalId: ['id', 'external_id', 'externalid', 'uuid'],
  timeColumn: ['time', 'hora', 'hour'],
}

/** Aliases → métrica, para sugerir a coluna de valor a partir do nome do arquivo/cabeçalho. */
const METRIC_ALIASES: Record<HealthMetricType, readonly string[]> = {
  steps: ['steps', 'passos', 'step_count', 'stepcount'],
  sleep_duration: ['sleep', 'sono', 'sleep_duration', 'sleep_minutes', 'duracao_sono'],
  sleep_quality: ['sleep_quality', 'qualidade_sono', 'sleep_score'],
  resting_heart_rate: ['heart_rate', 'resting_hr', 'rhr', 'frequencia_cardiaca', 'fc_repouso', 'resting_heart_rate'],
  weight: ['weight', 'peso', 'body_weight'],
  active_calories: ['calories', 'calorias', 'active_calories', 'kcal'],
  activity_duration: ['activity', 'atividade', 'activity_duration', 'exercise_minutes'],
  distance: ['distance', 'distancia', 'km'],
  wellness_energy: ['energy', 'energia'],
  wellness_soreness: ['soreness', 'dor_muscular'],
  wellness_motivation: ['motivation', 'motivacao'],
}

function suggestFieldForColumn(columnToken: string): { field: HealthImportTargetField; confidence: HealthImportDetectionConfidence } | null {
  for (const field of Object.keys(COLUMN_ALIASES) as HealthImportTargetField[]) {
    if (COLUMN_ALIASES[field].includes(columnToken)) {
      return { field, confidence: 'high' }
    }
  }
  for (const field of Object.keys(COLUMN_ALIASES) as HealthImportTargetField[]) {
    if (COLUMN_ALIASES[field].some((alias) => columnToken.includes(alias) || alias.includes(columnToken))) {
      return { field, confidence: 'medium' }
    }
  }
  return null
}

/** Sugere, por coluna do cabeçalho, um campo interno provável — nunca duas colunas para o mesmo campo com confiança "high". */
export function suggestColumnMappings(header: string[]): HealthImportColumnSuggestion[] {
  const suggestions: HealthImportColumnSuggestion[] = []
  const takenHighConfidenceFields = new Set<HealthImportTargetField>()

  for (const column of header) {
    const token = normalizeToken(column)
    const suggestion = suggestFieldForColumn(token)
    if (!suggestion) continue

    if (suggestion.confidence === 'high') {
      if (takenHighConfidenceFields.has(suggestion.field)) continue
      takenHighConfidenceFields.add(suggestion.field)
    }

    suggestions.push({ column, field: suggestion.field, confidence: suggestion.confidence })
  }

  return suggestions
}

function tokensFromFileName(fileName: string): string[] {
  const withoutExtension = fileName.replace(/\.[^./\\]+$/, '')
  return normalizeToken(withoutExtension).split('_').filter(Boolean)
}

/**
 * Sugere uma métrica a partir do nome do arquivo e, secundariamente, do
 * cabeçalho — sempre com evidência explicável e sujeita a revisão (seção 11).
 */
export function suggestMetric(file: Pick<HealthImportFile, 'name' | 'header'>): HealthImportMetricSuggestion | null {
  const nameTokens = new Set(tokensFromFileName(file.name))

  for (const metric of HEALTH_METRIC_TYPES) {
    const matchedAlias = METRIC_ALIASES[metric].find((alias) => nameTokens.has(alias))
    if (matchedAlias) {
      return { metric, confidence: 'high', evidence: `nome do arquivo contém "${matchedAlias}"` }
    }
  }

  const headerTokens = file.header.map(normalizeToken)
  for (const metric of HEALTH_METRIC_TYPES) {
    const matchedAlias = METRIC_ALIASES[metric].find((alias) => headerTokens.includes(alias))
    if (matchedAlias) {
      return { metric, confidence: 'medium', evidence: `cabeçalho contém a coluna "${matchedAlias}"` }
    }
  }

  return null
}

/**
 * Compara cabeçalho/delimitador/nome do arquivo com presets salvos para
 * sugerir compatibilidade — nunca aplica um preset automaticamente
 * (seção 20). Compatível quando o conjunto de colunas mapeadas do preset é
 * um subconjunto do cabeçalho atual.
 */
export function suggestCompatiblePresets(file: HealthImportFile, presets: readonly HealthImportMapping[]): string[] {
  const headerTokens = new Set(file.header.map(normalizeToken))

  return presets
    .filter((preset) => preset.sourceFormat === file.kind)
    .filter((preset) => {
      const mappedColumns = Object.values(preset.columns).filter((c): c is string => typeof c === 'string')
      if (mappedColumns.length === 0) return false
      return mappedColumns.every((column) => headerTokens.has(normalizeToken(column)))
    })
    .map((preset) => preset.id)
}

export function buildDetectionResult(file: HealthImportFile, presets: readonly HealthImportMapping[]): HealthImportDetectionResult {
  return {
    columnSuggestions: suggestColumnMappings(file.header),
    metricSuggestion: suggestMetric(file),
    presetSuggestions: suggestCompatiblePresets(file, presets),
  }
}
