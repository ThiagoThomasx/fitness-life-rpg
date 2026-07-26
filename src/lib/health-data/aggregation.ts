// Agregação diária — Sprint 28 Parte 3. Motor puro: nunca persiste nada,
// sempre deriva `DailyHealthSummary` a partir de `HealthDataRecord[]` sob
// demanda (ver `HEALTH-DATA-AGGREGATION.md` para a justificativa de cada
// estratégia por métrica). Nunca soma dois totais diários de fontes
// diferentes — cada métrica tem uma estratégia explícita e documentada.

import { METRIC_SUMMARY_FIELD, highestPrioritySource, toDateKey } from './aggregation-shared'
import type { DailySummaryMetricField } from './aggregation-shared'
import { detectConflicts, getConflictsForDay } from './conflicts'
import { computeDailyQuality } from './quality-aggregation'
import { mean, median, sumMergedIntervalsMs } from './stats'
import type { DailyHealthSummary, HealthDataConflict, HealthDataRecord, HealthDataSource, HealthMetricType } from './types'

type MetricAggregator = (records: readonly HealthDataRecord[]) => number | undefined

function recordsFromWinningSource(records: readonly HealthDataRecord[]): HealthDataRecord[] {
  const winner = highestPrioritySource(records.map((r) => r.source))
  if (!winner) return []
  return records.filter((r) => r.source === winner)
}

function latestOf(records: readonly HealthDataRecord[]): HealthDataRecord | undefined {
  return records.reduce<HealthDataRecord | undefined>(
    (latest, r) => (!latest || r.recordedAt > latest.recordedAt ? r : latest),
    undefined
  )
}

/** Passos, calorias ativas: contadores cumulativos de um único dispositivo — nunca somar duas fontes, usar o maior valor reportado pela fonte de maior prioridade. */
function maxOfWinningSource(records: readonly HealthDataRecord[]): number | undefined {
  const winning = recordsFromWinningSource(records)
  if (winning.length === 0) return undefined
  return Math.max(...winning.map((r) => r.value))
}

/** Distância: eventos independentes (caminhadas/corridas) dentro da mesma fonte — soma sem contar duas fontes. */
function sumOfWinningSource(records: readonly HealthDataRecord[]): number | undefined {
  const winning = recordsFromWinningSource(records)
  if (winning.length === 0) return undefined
  return winning.reduce((sum, r) => sum + r.value, 0)
}

/** Sono, duração de atividade: intervalos podem se sobrepor entre registros da mesma fonte — mescla antes de somar para nunca contar o mesmo período duas vezes. */
function sumIntervalsOfWinningSource(records: readonly HealthDataRecord[]): number | undefined {
  const winning = recordsFromWinningSource(records)
  if (winning.length === 0) return undefined

  const withInterval = winning.filter((r) => r.startAt && r.endAt)
  const withoutInterval = winning.filter((r) => !(r.startAt && r.endAt))

  const intervalMinutes =
    sumMergedIntervalsMs(
      withInterval.map((r) => ({ startMs: new Date(r.startAt!).getTime(), endMs: new Date(r.endAt!).getTime() }))
    ) / 60_000
  const rawMinutes = withoutInterval.reduce((sum, r) => sum + r.value, 0)

  return intervalMinutes + rawMinutes
}

/** Qualidade do sono, entre outras métricas pontuais: o registro mais recente do dia, dentro da fonte de maior prioridade. */
function latestOfWinningSource(records: readonly HealthDataRecord[]): number | undefined {
  return latestOf(recordsFromWinningSource(records))?.value
}

/** Peso: sempre o registro válido mais recente do dia, nunca a média — mudanças de peso intradiárias não são somáveis. */
function latestOfAll(records: readonly HealthDataRecord[]): number | undefined {
  return latestOf(records)?.value
}

/** FC de repouso: mediana entre todas as fontes do dia — resistente a outliers de um único sensor ruim, sem depender de uma fonte só. */
function medianOfAll(records: readonly HealthDataRecord[]): number | undefined {
  if (records.length === 0) return undefined
  return median(records.map((r) => r.value))
}

/** Bem-estar (energia/dor/motivação): normalmente uma única entrada por dia — média da fonte de maior prioridade cobre o caso raro de múltiplas entradas. */
function averageOfWinningSource(records: readonly HealthDataRecord[]): number | undefined {
  const winning = recordsFromWinningSource(records)
  if (winning.length === 0) return undefined
  return mean(winning.map((r) => r.value))
}

const METRIC_AGGREGATORS: Record<HealthMetricType, MetricAggregator> = {
  steps: maxOfWinningSource,
  sleep_duration: sumIntervalsOfWinningSource,
  sleep_quality: latestOfWinningSource,
  resting_heart_rate: medianOfAll,
  weight: latestOfAll,
  active_calories: maxOfWinningSource,
  activity_duration: sumIntervalsOfWinningSource,
  distance: sumOfWinningSource,
  wellness_energy: averageOfWinningSource,
  wellness_soreness: averageOfWinningSource,
  wellness_motivation: averageOfWinningSource,
}

function groupByDate(records: readonly HealthDataRecord[]): Map<string, HealthDataRecord[]> {
  const groups = new Map<string, HealthDataRecord[]>()
  for (const record of records) {
    const key = toDateKey(record.recordedAt)
    const group = groups.get(key)
    if (group) {
      group.push(record)
    } else {
      groups.set(key, [record])
    }
  }
  return groups
}

function groupByMetric(records: readonly HealthDataRecord[]): Map<HealthMetricType, HealthDataRecord[]> {
  const groups = new Map<HealthMetricType, HealthDataRecord[]>()
  for (const record of records) {
    const group = groups.get(record.metric)
    if (group) {
      group.push(record)
    } else {
      groups.set(record.metric, [record])
    }
  }
  return groups
}

function uniqueSources(records: readonly HealthDataRecord[]): HealthDataSource[] {
  return Array.from(new Set(records.map((r) => r.source)))
}

function buildMetricFields(byMetric: Map<HealthMetricType, HealthDataRecord[]>): Partial<Record<DailySummaryMetricField, number>> {
  const fields: Partial<Record<DailySummaryMetricField, number>> = {}
  for (const [metric, metricRecords] of Array.from(byMetric)) {
    const value = METRIC_AGGREGATORS[metric](metricRecords)
    if (value !== undefined) {
      fields[METRIC_SUMMARY_FIELD[metric]] = value
    }
  }
  return fields
}

function buildSummaryForDay(
  date: string,
  dayRecords: readonly HealthDataRecord[],
  allConflicts: readonly HealthDataConflict[]
): DailyHealthSummary {
  const dayConflicts = getConflictsForDay(allConflicts, date)
  const metricFields = buildMetricFields(groupByMetric(dayRecords))

  return {
    date,
    sources: uniqueSources(dayRecords),
    quality: computeDailyQuality(dayRecords, dayConflicts),
    conflicts: dayConflicts,
    ...metricFields,
  }
}

/**
 * Constrói o resumo diário de todos os dias presentes em `records`, mais
 * recente primeiro. Motor puro — nunca persiste o resultado (ver princípio
 * 4.1 da Parte 3).
 */
export function buildDailySummaries(records: readonly HealthDataRecord[]): DailyHealthSummary[] {
  const conflicts = detectConflicts(records)
  const byDate = groupByDate(records)

  return Array.from(byDate.entries())
    .map(([date, dayRecords]) => buildSummaryForDay(date, dayRecords, conflicts))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Resumo de um único dia (`YYYY-MM-DD`), ou `null` quando não há nenhum registro naquele dia. */
export function buildDailySummaryForDate(records: readonly HealthDataRecord[], date: string): DailyHealthSummary | null {
  const dayRecords = records.filter((r) => toDateKey(r.recordedAt) === date)
  if (dayRecords.length === 0) return null

  const conflicts = detectConflicts(dayRecords)
  return buildSummaryForDay(date, dayRecords, conflicts)
}
