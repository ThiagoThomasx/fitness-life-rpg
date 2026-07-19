// Motor de bem-estar por ciclo de treino — Sprint 19 Parte 3B.
//
// Consolida `WorkoutReadinessCheckIn[]` (fonte única de bem-estar, ver
// `wellness-associations.ts`) dentro do intervalo de um `TrainingCycle`:
// médias, tendência interna (primeira vs. segunda metade) e associações com
// treino restritas ao ciclo. Puramente derivado — não lê storage, não
// persiste nada, não altera ciclos/check-ins. Reaproveita `buildCycleSummary`
// para a prontidão média em vez de duplicar a fórmula.
//
// Semanas parciais: os agregados semanais usados para associações são
// construídos apenas a partir de sessões já filtradas para o intervalo do
// ciclo — uma semana que atravessa o início/fim do ciclo naturalmente reflete
// só os dias dentro do ciclo, sem precisar de um corte especial por semana.

import { getWorkoutHistory, type CompletedWorkout } from './workout-history'
import { sessionVolumeKg, sessionTotalSets, getWeekEnd, type WeekSummary } from './training-load'
import { getWeekStart } from './weekly-plan'
import { getCheckIns, type WorkoutReadinessCheckIn } from './readiness-check-ins'
import { buildCycleSummary } from './training-cycle-summary'
import {
  computeAllWellnessTrainingAssociations,
  DEFAULT_WELLNESS_ASSOCIATION_CONFIG,
  type WellnessAssociation,
  type WellnessMetric,
} from './wellness-associations'
import type { TrainingCycle } from './training-cycles'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface CycleWellnessConfig {
  minimumCheckIns: number
  minimumCheckInsPerHalf: number
  minimumWeeksForAssociations: number
  /** Diferença percentual mínima entre metades para não classificar como "stable". */
  stableTolerance: number
  /** Coeficiente de variação (%) acima do qual a tendência é "irregular" em vez de uma direção clara. */
  irregularityThreshold: number
  maximumAssociationsShown: number
}

export const DEFAULT_CYCLE_WELLNESS_CONFIG: CycleWellnessConfig = {
  minimumCheckIns: 4,
  minimumCheckInsPerHalf: 3,
  minimumWeeksForAssociations: DEFAULT_WELLNESS_ASSOCIATION_CONFIG.minimumWeeks,
  stableTolerance: 8,
  irregularityThreshold: 45,
  maximumAssociationsShown: 3,
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CycleWellnessTrendDirection =
  | 'increasing'
  | 'stable'
  | 'decreasing'
  | 'irregular'
  | 'insufficient_data'

export interface CycleWellnessTrend {
  metric: WellnessMetric
  firstHalfAverage?: number
  secondHalfAverage?: number
  difference?: number
  direction: CycleWellnessTrendDirection
  sampleSize: number
}

export type CycleWellnessDataStatus = 'available' | 'partial' | 'insufficient_data' | 'no_data'

export interface CycleWellnessSummary {
  cycleId: string

  periodStart: string
  periodEnd: string

  checkInCount: number
  coveredDays: number
  coverageRate?: number

  averageSleepHours?: number
  averageSleepQuality?: number
  averageEnergy?: number
  averageStress?: number
  averageSoreness?: number
  averageMood?: number
  averageMotivation?: number
  averageReadiness?: number

  trends: CycleWellnessTrend[]
  associations: WellnessAssociation[]

  messages: string[]

  dataStatus: CycleWellnessDataStatus
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function averageMetric(checkIns: WorkoutReadinessCheckIn[], metric: WellnessMetric): number | undefined {
  const values = checkIns.map((c) => c[metric]).filter((v): v is number => v !== undefined)
  const avg = average(values)
  return avg === undefined ? undefined : round(avg, 2)
}

function dateStr(iso: string): string {
  return iso.slice(0, 10)
}

const ALL_WELLNESS_METRICS: WellnessMetric[] = [
  'energy',
  'soreness',
  'sleepQuality',
  'motivation',
  'stress',
  'mood',
  'sleepHours',
]

const METRIC_LABELS: Record<WellnessMetric, string> = {
  energy: 'energia',
  soreness: 'dor muscular',
  sleepQuality: 'qualidade do sono',
  motivation: 'motivação',
  stress: 'estresse',
  mood: 'humor',
  sleepHours: 'horas de sono',
}

// ─── Fase 4: intervalo do ciclo ───────────────────────────────────────────────

/**
 * Início em `startDate`; fim em `completedAt` (concluído ou arquivado) ou em
 * `now` para um ciclo ativo. Ciclos arquivados preservam `completedAt`, então
 * a análise não muda ao arquivar/restaurar.
 */
export function getCycleDateRange(cycle: TrainingCycle, now: Date = new Date()): { start: string; end: string } {
  const start = dateStr(cycle.startDate)
  const end = cycle.completedAt ? dateStr(cycle.completedAt) : now.toISOString().slice(0, 10)
  return { start, end }
}

function countCalendarDays(start: string, end: string): number {
  const startMs = new Date(start + 'T00:00:00').getTime()
  const endMs = new Date(end + 'T00:00:00').getTime()
  if (endMs < startMs) return 0
  return Math.floor((endMs - startMs) / 86400000) + 1
}

// ─── Fase 5: filtragem de check-ins ───────────────────────────────────────────

/** Inclui registros no primeiro e no último dia do ciclo; não deduplica múltiplos check-ins no mesmo dia. */
export function filterCheckInsForCycle(
  cycle: TrainingCycle,
  checkIns: WorkoutReadinessCheckIn[],
  now: Date = new Date()
): WorkoutReadinessCheckIn[] {
  const { start, end } = getCycleDateRange(cycle, now)
  return checkIns.filter((c) => {
    const d = dateStr(c.createdAt)
    return d >= start && d <= end
  })
}

function filterWorkoutsForCycle(cycle: TrainingCycle, workouts: CompletedWorkout[], now: Date): CompletedWorkout[] {
  const { start, end } = getCycleDateRange(cycle, now)
  return workouts.filter((w) => {
    const d = dateStr(w.completedAt)
    return d >= start && d <= end
  })
}

// ─── Fase 6: cobertura ────────────────────────────────────────────────────────

function countCoveredDays(checkIns: WorkoutReadinessCheckIn[]): number {
  const days = new Set(checkIns.map((c) => dateStr(c.createdAt)))
  return days.size
}

// ─── Fase 8: tendência interna do ciclo ───────────────────────────────────────

function coefficientOfVariationPct(values: number[]): number {
  const mean = average(values)
  if (mean === undefined || mean === 0 || values.length < 2) return 0
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  const stdev = Math.sqrt(variance)
  return (stdev / mean) * 100
}

function buildTrend(
  metric: WellnessMetric,
  checkIns: WorkoutReadinessCheckIn[],
  start: string,
  end: string,
  config: CycleWellnessConfig
): CycleWellnessTrend {
  const startMs = new Date(start + 'T00:00:00').getTime()
  const endMs = new Date(end + 'T00:00:00').getTime()
  const midMs = startMs + Math.floor((endMs - startMs) / 2)
  const midDate = new Date(midMs).toISOString().slice(0, 10)

  const firstHalfValues: number[] = []
  const secondHalfValues: number[] = []
  for (const c of checkIns) {
    const value = c[metric]
    if (value === undefined) continue
    const d = dateStr(c.createdAt)
    if (d < midDate) firstHalfValues.push(value)
    else secondHalfValues.push(value)
  }

  const sampleSize = firstHalfValues.length + secondHalfValues.length

  if (
    firstHalfValues.length < config.minimumCheckInsPerHalf ||
    secondHalfValues.length < config.minimumCheckInsPerHalf
  ) {
    return {
      metric,
      firstHalfAverage: average(firstHalfValues),
      secondHalfAverage: average(secondHalfValues),
      direction: 'insufficient_data',
      sampleSize,
    }
  }

  const firstAvg = average(firstHalfValues) as number
  const secondAvg = average(secondHalfValues) as number
  const difference = round(secondAvg - firstAvg, 2)
  const diffPct = firstAvg !== 0 ? (difference / firstAvg) * 100 : secondAvg > 0 ? 100 : 0
  const cv = coefficientOfVariationPct([...firstHalfValues, ...secondHalfValues])

  let direction: CycleWellnessTrendDirection
  if (cv > config.irregularityThreshold) direction = 'irregular'
  else if (Math.abs(diffPct) < config.stableTolerance) direction = 'stable'
  else direction = diffPct > 0 ? 'increasing' : 'decreasing'

  return {
    metric,
    firstHalfAverage: round(firstAvg, 2),
    secondHalfAverage: round(secondAvg, 2),
    difference,
    direction,
    sampleSize,
  }
}

// ─── Fase 10/11: associações restritas ao ciclo, com semanas parciais ────────

function buildCycleWeekSummaries(cycleWorkouts: CompletedWorkout[], start: string, end: string): WeekSummary[] {
  const weekStarts: string[] = []
  let cursor = getWeekStart(new Date(start + 'T00:00:00'))
  const lastWeekStart = getWeekStart(new Date(end + 'T00:00:00'))
  while (cursor <= lastWeekStart) {
    weekStarts.push(cursor)
    const d = new Date(cursor + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    cursor = d.toISOString().slice(0, 10)
  }

  return weekStarts.map((weekStart) => {
    const weekEnd = getWeekEnd(weekStart)
    // cycleWorkouts já está restrito ao intervalo do ciclo, então uma semana
    // que atravessa a borda do ciclo naturalmente só soma os dias dentro dele.
    const weekWorkouts = cycleWorkouts.filter((w) => {
      const d = dateStr(w.completedAt)
      return d >= weekStart && d <= weekEnd
    })

    return {
      startDate: weekStart,
      endDate: weekEnd,
      totalSessions: weekWorkouts.length,
      totalVolumeKg: weekWorkouts.reduce((sum, w) => sum + sessionVolumeKg(w), 0),
      totalSets: weekWorkouts.reduce((sum, w) => sum + sessionTotalSets(w), 0),
      prsCount: weekWorkouts.reduce((sum, w) => sum + w.prsCount, 0),
      averageReadiness: null,
      completionRate: 0,
      adjustedSessions: weekWorkouts.filter(
        (w) => w.appliedSessionAdjustment && w.appliedSessionAdjustment.mode !== 'original'
      ).length,
    }
  })
}

function selectTopAssociations(associations: WellnessAssociation[], maxCount: number): WellnessAssociation[] {
  const usable = associations.filter((a) => a.direction !== 'unclear')
  const confidenceRank: Record<WellnessAssociation['confidence'], number> = { high: 3, medium: 2, low: 1 }

  const withFinding = usable
    .filter((a) => a.direction === 'positive' || a.direction === 'negative')
    .sort((a, b) => {
      const confDiff = confidenceRank[b.confidence] - confidenceRank[a.confidence]
      if (confDiff !== 0) return confDiff
      return b.sampleSize - a.sampleSize
    })

  if (withFinding.length >= maxCount) return withFinding.slice(0, maxCount)

  const neutral = usable
    .filter((a) => a.direction === 'neutral')
    .sort((a, b) => b.sampleSize - a.sampleSize)

  return [...withFinding, ...neutral].slice(0, maxCount)
}

// ─── Fase 14: mensagens ────────────────────────────────────────────────────────

function buildMessages(params: {
  cycle: TrainingCycle
  checkInCount: number
  coveredDays: number
  cycleDays: number
  trends: CycleWellnessTrend[]
  associations: WellnessAssociation[]
  minimumCheckIns: number
}): string[] {
  const { cycle, checkInCount, coveredDays, cycleDays, trends, associations, minimumCheckIns } = params
  const messages: string[] = []

  if (checkInCount === 0) {
    messages.push('Ainda não há check-ins registrados neste período.')
    return messages
  }

  messages.push(
    `Foram registrados ${checkInCount} check-in${checkInCount !== 1 ? 's' : ''} em ${coveredDays} de ${cycleDays} dias do ciclo.`
  )

  if (cycle.status === 'active') {
    messages.push('Análise parcial do ciclo em andamento.')
  }

  if (checkInCount < minimumCheckIns) {
    messages.push('A amostra deste ciclo ainda é pequena para calcular tendências ou associações confiáveis.')
  }

  const clearTrends = trends.filter((t) => t.direction !== 'insufficient_data')
  if (checkInCount >= minimumCheckIns && clearTrends.length === 0) {
    messages.push('Este ciclo ainda é curto demais para comparar tendências internas.')
  }

  for (const trend of clearTrends) {
    const label = METRIC_LABELS[trend.metric]
    if (trend.direction === 'stable') {
      messages.push(`A ${label} média ficou semelhante entre a primeira e a segunda metade do ciclo.`)
    } else if (trend.direction === 'increasing') {
      messages.push(`A ${label} média aumentou entre a primeira e a segunda metade do ciclo.`)
    } else if (trend.direction === 'decreasing') {
      messages.push(`A ${label} média diminuiu entre a primeira e a segunda metade do ciclo.`)
    } else if (trend.direction === 'irregular') {
      messages.push(`A ${label} variou de forma irregular ao longo do ciclo, sem uma direção clara.`)
    }
  }

  for (const association of associations) {
    messages.push(association.summary + '.')
  }

  if (checkInCount > 0) {
    messages.push(
      'Alguns campos não são comparados com prontidão porque já fazem parte do cálculo do score.'
    )
  }

  return messages
}

// ─── Fase 3: engine principal ─────────────────────────────────────────────────

export function buildCycleWellnessSummary(
  cycle: TrainingCycle,
  checkIns: WorkoutReadinessCheckIn[] = getCheckIns(),
  workouts: CompletedWorkout[] = getWorkoutHistory(),
  now: Date = new Date(),
  config: CycleWellnessConfig = DEFAULT_CYCLE_WELLNESS_CONFIG
): CycleWellnessSummary {
  const { start, end } = getCycleDateRange(cycle, now)
  const cycleCheckIns = filterCheckInsForCycle(cycle, checkIns, now)
  const cycleWorkouts = filterWorkoutsForCycle(cycle, workouts, now)

  const checkInCount = cycleCheckIns.length
  const coveredDays = countCoveredDays(cycleCheckIns)
  const cycleDays = countCalendarDays(start, end)
  const coverageRate = cycleDays > 0 ? round(coveredDays / cycleDays, 3) : undefined

  const trends = ALL_WELLNESS_METRICS.map((metric) => buildTrend(metric, cycleCheckIns, start, end, config))

  let associations: WellnessAssociation[] = []
  if (checkInCount > 0) {
    const weekSummaries = buildCycleWeekSummaries(cycleWorkouts, start, end)
    const allAssociations = computeAllWellnessTrainingAssociations(cycleCheckIns, weekSummaries, {
      ...DEFAULT_WELLNESS_ASSOCIATION_CONFIG,
      minimumWeeks: config.minimumWeeksForAssociations,
    })
    associations = selectTopAssociations(allAssociations, config.maximumAssociationsShown)
  }

  let dataStatus: CycleWellnessDataStatus
  if (checkInCount === 0) {
    dataStatus = 'no_data'
  } else if (checkInCount < config.minimumCheckIns) {
    dataStatus = 'insufficient_data'
  } else if (cycle.status === 'active' || trends.every((t) => t.direction === 'insufficient_data')) {
    dataStatus = 'partial'
  } else {
    dataStatus = 'available'
  }

  const messages = buildMessages({
    cycle,
    checkInCount,
    coveredDays,
    cycleDays,
    trends,
    associations,
    minimumCheckIns: config.minimumCheckIns,
  })

  return {
    cycleId: cycle.id,
    periodStart: start,
    periodEnd: end,
    checkInCount,
    coveredDays,
    coverageRate,
    averageSleepHours: averageMetric(cycleCheckIns, 'sleepHours'),
    averageSleepQuality: averageMetric(cycleCheckIns, 'sleepQuality'),
    averageEnergy: averageMetric(cycleCheckIns, 'energy'),
    averageStress: averageMetric(cycleCheckIns, 'stress'),
    averageSoreness: averageMetric(cycleCheckIns, 'soreness'),
    averageMood: averageMetric(cycleCheckIns, 'mood'),
    averageMotivation: averageMetric(cycleCheckIns, 'motivation'),
    averageReadiness: checkInCount === 0 ? undefined : buildCycleSummary(cycle, now).averageReadiness ?? undefined,
    trends,
    associations,
    messages,
    dataStatus,
  }
}

// ─── Fase 20: comparação de bem-estar entre ciclos ────────────────────────────

export type CycleWellnessMetricDataStatus =
  | 'comparable'
  | 'insufficient_cycle_a'
  | 'insufficient_cycle_b'
  | 'insufficient_both'

export interface CycleWellnessMetricComparison {
  metric: WellnessMetric
  valueA?: number
  valueB?: number
  absoluteDifference?: number
  sampleSizeA: number
  sampleSizeB: number
  dataStatus: CycleWellnessMetricDataStatus
}

export interface CycleWellnessComparison {
  cycleA: CycleWellnessSummary
  cycleB: CycleWellnessSummary
  metrics: CycleWellnessMetricComparison[]
  messages: string[]
}

const AVERAGE_FIELD_BY_METRIC: Record<WellnessMetric, keyof CycleWellnessSummary> = {
  energy: 'averageEnergy',
  soreness: 'averageSoreness',
  sleepQuality: 'averageSleepQuality',
  motivation: 'averageMotivation',
  stress: 'averageStress',
  mood: 'averageMood',
  sleepHours: 'averageSleepHours',
}

function sampleSizeForMetric(summary: CycleWellnessSummary, metric: WellnessMetric): number {
  const trend = summary.trends.find((t) => t.metric === metric)
  return trend?.sampleSize ?? 0
}

function compareMetric(
  summaryA: CycleWellnessSummary,
  summaryB: CycleWellnessSummary,
  metric: WellnessMetric,
  minimumSampleSize: number
): CycleWellnessMetricComparison {
  const valueA = summaryA[AVERAGE_FIELD_BY_METRIC[metric]] as number | undefined
  const valueB = summaryB[AVERAGE_FIELD_BY_METRIC[metric]] as number | undefined
  const sampleSizeA = sampleSizeForMetric(summaryA, metric)
  const sampleSizeB = sampleSizeForMetric(summaryB, metric)

  const hasA = valueA !== undefined && sampleSizeA >= minimumSampleSize
  const hasB = valueB !== undefined && sampleSizeB >= minimumSampleSize

  if (!hasA && !hasB) {
    return { metric, valueA, valueB, sampleSizeA, sampleSizeB, dataStatus: 'insufficient_both' }
  }
  if (!hasA) {
    return { metric, valueA, valueB, sampleSizeA, sampleSizeB, dataStatus: 'insufficient_cycle_a' }
  }
  if (!hasB) {
    return { metric, valueA, valueB, sampleSizeA, sampleSizeB, dataStatus: 'insufficient_cycle_b' }
  }

  return {
    metric,
    valueA,
    valueB,
    absoluteDifference: round((valueB as number) - (valueA as number), 2),
    sampleSizeA,
    sampleSizeB,
    dataStatus: 'comparable',
  }
}

function buildComparisonMessages(
  summaryA: CycleWellnessSummary,
  summaryB: CycleWellnessSummary,
  metrics: CycleWellnessMetricComparison[]
): string[] {
  const messages: string[] = []

  if (summaryA.checkInCount === 0 && summaryB.checkInCount === 0) {
    messages.push('Nenhum dos dois ciclos possui check-ins registrados para comparar.')
    return messages
  }
  if (summaryA.checkInCount === 0) {
    messages.push('O primeiro ciclo não possui check-ins registrados.')
  }
  if (summaryB.checkInCount === 0) {
    messages.push('O segundo ciclo não possui check-ins registrados.')
  }

  const durationDaysA = countCalendarDays(summaryA.periodStart, summaryA.periodEnd)
  const durationDaysB = countCalendarDays(summaryB.periodStart, summaryB.periodEnd)
  if (durationDaysA !== durationDaysB) {
    messages.push('Os ciclos têm durações diferentes; considere isso ao comparar as médias.')
  }

  if (Math.abs(summaryA.checkInCount - summaryB.checkInCount) >= 3) {
    messages.push('Um dos ciclos tem bem mais check-ins registrados que o outro, o que pode afetar a comparação.')
  }

  for (const m of metrics) {
    const label = METRIC_LABELS[m.metric]
    if (m.dataStatus === 'insufficient_both') {
      messages.push(`Não há registros suficientes de ${label} em nenhum dos dois ciclos para comparar.`)
    } else if (m.dataStatus === 'insufficient_cycle_a') {
      messages.push(`Não há registros suficientes de ${label} no primeiro ciclo para comparar.`)
    } else if (m.dataStatus === 'insufficient_cycle_b') {
      messages.push(`Não há registros suficientes de ${label} no segundo ciclo para comparar.`)
    } else if (m.absoluteDifference === 0) {
      messages.push(`A ${label} média ficou semelhante entre os dois ciclos.`)
    }
  }

  return messages
}

export function compareCycleWellness(
  summaryA: CycleWellnessSummary,
  summaryB: CycleWellnessSummary,
  config: CycleWellnessConfig = DEFAULT_CYCLE_WELLNESS_CONFIG
): CycleWellnessComparison {
  const metrics = ALL_WELLNESS_METRICS.map((metric) =>
    compareMetric(summaryA, summaryB, metric, config.minimumCheckInsPerHalf)
  )

  return {
    cycleA: summaryA,
    cycleB: summaryB,
    metrics,
    messages: buildComparisonMessages(summaryA, summaryB, metrics),
  }
}
