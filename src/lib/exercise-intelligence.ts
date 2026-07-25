// Exercise Intelligence Engine — Sprint 22 Parte 1.
//
// Camada pura de agregação sobre o histórico já persistido
// (`workout-history.ts`). Nada aqui é persistido: tudo é recalculado sob
// demanda a partir de `CompletedWorkout[]`, para nunca divergir da fonte de
// verdade e continuar funcionando com histórico legado (sessões salvas antes
// desta sprint, sem `source`/`plannedExerciseId`/`substitution`).
//
// Reutiliza `calculateVolumeKg`/`calculateEstimated1RM` de
// `exercise-records.ts` — nunca reimplementa a fórmula de volume.
//
// Identidade do exercício: agrupamento é sempre por `exerciseId` (nunca só
// por nome). Substituições são vinculadas por nome normalizado
// (`ExerciseSubstitution.plannedExerciseName`) porque o exercício
// originalmente planejado pode não ter um `exerciseId` de catálogo (templates
// podem referenciar exercícios só pelo nome — ver `active-workout.ts`).

import { getWorkoutHistory, type CompletedWorkout, type SetRecord } from './workout-history'
import { calculateVolumeKg } from './exercise-records'
import { normalizeExerciseName } from './planned-performed-comparison'

// ─── Normalização ────────────────────────────────────────────────────────────

export interface NormalizedExerciseExecution {
  workoutId: string
  exerciseId: string
  exerciseName: string
  performedAt: string
  workoutName: string
  programId?: string
  programWeekNumber?: number
  /** `CompletedWorkoutSource.plannedWorkoutId` — permite linkar de volta ao treino planejado (Sprint 22 §19/§25). */
  plannedWorkoutId?: string
  plannedExerciseId?: string
  wasSubstitution: boolean
  substitutedFromExerciseName?: string
  substitutionReason?: string
  sets: SetRecord[]
  totalSets: number
  totalReps: number
  totalVolumeKg: number
}

/**
 * Converte o histórico bruto em execuções normalizadas de um exercício,
 * mais recente primeiro (mesma ordem de `getWorkoutHistory`). Histórico
 * vazio ou exercício nunca executado retornam `[]`, nunca lançam.
 */
export function normalizeExerciseExecutions(
  exerciseId: string,
  history: CompletedWorkout[] = getWorkoutHistory()
): NormalizedExerciseExecution[] {
  const executions: NormalizedExerciseExecution[] = []
  for (const workout of history) {
    for (const record of workout.exercises) {
      if (record.exerciseId !== exerciseId) continue
      executions.push({
        workoutId: workout.id,
        exerciseId: record.exerciseId,
        exerciseName: record.exerciseName,
        performedAt: workout.completedAt,
        workoutName: workout.workoutName,
        programId: workout.source?.programId,
        programWeekNumber: workout.source?.programWeekNumber,
        plannedWorkoutId: workout.source?.plannedWorkoutId,
        plannedExerciseId: record.plannedExerciseId,
        wasSubstitution: !!record.substitution,
        substitutedFromExerciseName: record.substitution?.plannedExerciseName,
        substitutionReason: record.substitution?.reason,
        sets: record.sets,
        totalSets: record.sets.length,
        totalReps: record.sets.reduce((sum, s) => sum + s.reps, 0),
        totalVolumeKg: calculateVolumeKg(record.sets),
      })
    }
  }
  return executions
}

function maxOrZero(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values)
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

// ─── Exercise History Summary ────────────────────────────────────────────────

export interface ExerciseHistorySummary {
  exerciseId: string
  exerciseName: string
  totalExecutions: number
  /**
   * Número de treinos DISTINTOS em que o exercício apareceu — diferente de
   * `totalExecutions` só quando o mesmo exercício aparece mais de uma vez no
   * mesmo treino (ex: A/B duplicado numa sessão). Sprint 22 §10: nunca
   * misturar "execuções" com "treinos" na mesma métrica sem diferenciar.
   */
  totalWorkouts: number
  firstPerformedAt?: string
  lastPerformedAt?: string
  totalSets: number
  totalReps: number
  totalVolumeKg: number
  averageSetsPerExecution: number
  averageRepsPerSet?: number
  averageVolumePerExecution: number
  /** `undefined` com menos de 2 execuções — intervalo não existe com uma amostra só. */
  averageDaysBetweenExecutions?: number
  /** Vezes que este exercício ENTROU na sessão como substituto de outro. */
  substitutionsIn: number
  /** Vezes que este exercício foi SUBSTITUÍDO por outro (vinculado por nome — ver cabeçalho do módulo). */
  substitutionsOut: number
}

export function getExerciseHistorySummary(exerciseId: string): ExerciseHistorySummary | null {
  const history = getWorkoutHistory()
  const executions = normalizeExerciseExecutions(exerciseId, history)
  if (executions.length === 0) return null

  const chronological = [...executions].reverse()
  const totalSets = executions.reduce((sum, e) => sum + e.totalSets, 0)
  const totalReps = executions.reduce((sum, e) => sum + e.totalReps, 0)
  const totalVolumeKg = executions.reduce((sum, e) => sum + e.totalVolumeKg, 0)

  let averageDaysBetweenExecutions: number | undefined
  if (chronological.length >= 2) {
    const first = new Date(chronological[0].performedAt).getTime()
    const last = new Date(chronological[chronological.length - 1].performedAt).getTime()
    averageDaysBetweenExecutions = (last - first) / 86_400_000 / (chronological.length - 1)
  }

  return {
    exerciseId,
    exerciseName: executions[0].exerciseName,
    totalExecutions: executions.length,
    totalWorkouts: new Set(executions.map((e) => e.workoutId)).size,
    firstPerformedAt: chronological[0].performedAt,
    lastPerformedAt: executions[0].performedAt,
    totalSets,
    totalReps,
    totalVolumeKg,
    averageSetsPerExecution: totalSets / executions.length,
    averageRepsPerSet: totalSets > 0 ? totalReps / totalSets : undefined,
    averageVolumePerExecution: totalVolumeKg / executions.length,
    averageDaysBetweenExecutions,
    substitutionsIn: executions.filter((e) => e.wasSubstitution).length,
    substitutionsOut: countTimesSubstitutedOut(executions[0].exerciseName, history),
  }
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export type ExerciseTimelineOrder = 'newest_first' | 'oldest_first'

/**
 * Timeline ordenada de um exercício — reaproveita `NormalizedExerciseExecution`
 * (nenhum dado novo, só reordenação) para não duplicar a estrutura descrita
 * na spec (Sprint 22 §14).
 */
export function getExerciseTimeline(
  exerciseId: string,
  order: ExerciseTimelineOrder = 'newest_first'
): NormalizedExerciseExecution[] {
  const executions = normalizeExerciseExecutions(exerciseId)
  return order === 'newest_first' ? executions : [...executions].reverse()
}

// ─── Personal Record Engine ───────────────────────────────────────────────────

export type ExerciseRecordType =
  | 'max_load'
  | 'max_reps'
  | 'best_set_volume'
  | 'max_session_volume'
  | 'max_sets_in_session'

export interface ExerciseRecordEvidence {
  type: ExerciseRecordType
  value: number
  unit: 'kg' | 'reps' | 'sets'
  achievedAt: string
  workoutId: string
  workoutName: string
}

export interface ExercisePersonalRecords {
  maxLoad?: ExerciseRecordEvidence
  maxReps?: ExerciseRecordEvidence
  bestSetVolume?: ExerciseRecordEvidence
  maxSessionVolume?: ExerciseRecordEvidence
  maxSetsInSession?: ExerciseRecordEvidence
}

/**
 * "Melhor série" = maior `carga × repetições` de uma série só (`bestSetVolume`)
 * — critério explícito escolhido por já ser a mesma fórmula de volume usada
 * em todo o projeto (`calculateVolumeKg`), aplicada a uma série em vez da
 * sessão inteira (Sprint 22 §16.3).
 *
 * Empates (Sprint 22 §19): comparação estrita `>`, então o PRIMEIRO valor
 * cronológico a alcançar um patamar fica registrado — repetir o mesmo valor
 * depois não gera um novo evento de recorde. Decisão consistente com
 * `detectExercisePrs` (exercise-records.ts), que também usa `>` estrito.
 */
export function getExercisePersonalRecords(exerciseId: string): ExercisePersonalRecords {
  const chronological = getExerciseTimeline(exerciseId, 'oldest_first')
  const records: ExercisePersonalRecords = {}

  function consider(
    key: keyof ExercisePersonalRecords,
    type: ExerciseRecordType,
    value: number,
    unit: ExerciseRecordEvidence['unit'],
    exec: NormalizedExerciseExecution
  ) {
    if (value <= 0) return
    const current = records[key]
    if (current && value <= current.value) return
    records[key] = { type, value, unit, achievedAt: exec.performedAt, workoutId: exec.workoutId, workoutName: exec.workoutName }
  }

  for (const exec of chronological) {
    for (const set of exec.sets) {
      consider('maxLoad', 'max_load', set.weight_kg, 'kg', exec)
      consider('maxReps', 'max_reps', set.reps, 'reps', exec)
      consider('bestSetVolume', 'best_set_volume', set.weight_kg * set.reps, 'kg', exec)
    }
    consider('maxSessionVolume', 'max_session_volume', exec.totalVolumeKg, 'kg', exec)
    consider('maxSetsInSession', 'max_sets_in_session', exec.totalSets, 'sets', exec)
  }

  return records
}

export interface DetectedExerciseRecordChange {
  type: ExerciseRecordType
  previousValue?: number
  newValue: number
  deltaAbsolute?: number
  deltaPercent?: number
}

interface SetInput {
  weight_kg: number
  reps: number
}

/**
 * Compara uma execução nova (ainda não salva) contra os recordes anteriores.
 * Igual a `detectExercisePrs`: deve ser chamado ANTES de `saveCompletedWorkout`
 * para a sessão atual não se comparar consigo mesma.
 */
export function detectNewExerciseRecords(exerciseId: string, sets: SetInput[]): DetectedExerciseRecordChange[] {
  const prior = getExercisePersonalRecords(exerciseId)
  const changes: DetectedExerciseRecordChange[] = []

  function change(type: ExerciseRecordType, previous: ExerciseRecordEvidence | undefined, newValue: number) {
    if (newValue <= 0) return
    if (previous && newValue <= previous.value) return
    const previousValue = previous?.value
    const deltaAbsolute = previousValue !== undefined ? newValue - previousValue : undefined
    const deltaPercent =
      previousValue !== undefined && previousValue > 0 ? ((newValue - previousValue) / previousValue) * 100 : undefined
    changes.push({ type, previousValue, newValue, deltaAbsolute, deltaPercent })
  }

  change('max_load', prior.maxLoad, maxOrZero(sets.map((s) => s.weight_kg)))
  change('max_reps', prior.maxReps, maxOrZero(sets.map((s) => s.reps)))
  change('best_set_volume', prior.bestSetVolume, maxOrZero(sets.map((s) => s.weight_kg * s.reps)))
  change('max_session_volume', prior.maxSessionVolume, calculateVolumeKg(sets))
  change('max_sets_in_session', prior.maxSetsInSession, sets.length)

  return changes
}

// ─── Trend Engine ──────────────────────────────────────────────────────────────

export type ExerciseTrendMetric = 'load' | 'volume' | 'reps' | 'frequency'
export type ExerciseTrendDirection = 'increasing' | 'stable' | 'decreasing' | 'insufficient_data'

export interface ExerciseTrend {
  metric: ExerciseTrendMetric
  direction: ExerciseTrendDirection
  currentValue?: number
  previousValue?: number
  percentageChange?: number
  sampleSize: number
  explanation: string
}

/** Janela: últimas 3 execuções vs. as 3 anteriores (Sprint 22 §21) — exige 6 execuções no mínimo. */
const TREND_WINDOW = 3
const MIN_SAMPLE_FOR_TREND = TREND_WINDOW * 2
/** Variação dentro de ±5% conta como estável — evita tratar ruído normal de treino como progresso/regressão real. */
const STABILITY_TOLERANCE_PERCENT = 5

function insufficientTrend(metric: ExerciseTrendMetric, sampleSize: number): ExerciseTrend {
  return {
    metric,
    direction: 'insufficient_data',
    sampleSize,
    explanation: `Amostra insuficiente (${sampleSize} execuções; mínimo ${MIN_SAMPLE_FOR_TREND} para calcular tendência)`,
  }
}

function windowTrend(metric: ExerciseTrendMetric, chronologicalValues: number[]): ExerciseTrend {
  const sampleSize = chronologicalValues.length
  if (sampleSize < MIN_SAMPLE_FOR_TREND) return insufficientTrend(metric, sampleSize)

  const currentValue = average(chronologicalValues.slice(-TREND_WINDOW))
  const previousValue = average(chronologicalValues.slice(-TREND_WINDOW * 2, -TREND_WINDOW))

  if (previousValue === 0) {
    return {
      metric,
      direction: 'insufficient_data',
      currentValue,
      previousValue,
      sampleSize,
      explanation: 'Janela anterior sem valor de referência (0) — variação percentual não é calculável',
    }
  }

  const percentageChange = ((currentValue - previousValue) / previousValue) * 100
  const direction: ExerciseTrendDirection =
    percentageChange > STABILITY_TOLERANCE_PERCENT
      ? 'increasing'
      : percentageChange < -STABILITY_TOLERANCE_PERCENT
        ? 'decreasing'
        : 'stable'

  return {
    metric,
    direction,
    currentValue,
    previousValue,
    percentageChange,
    sampleSize,
    explanation: `Últimas ${TREND_WINDOW} execuções vs. ${TREND_WINDOW} anteriores: ${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`,
  }
}

/**
 * Tendência de frequência: número de execuções nos últimos 28 dias
 * (a partir da execução mais recente, não da data real do sistema — mantém
 * o motor puro/determinístico e testável) contra os 28 dias anteriores a
 * essa janela. Convenção própria desta métrica porque frequência não é uma
 * série de valores por execução como carga/volume/reps — é uma contagem por
 * janela de tempo (Sprint 22 §22).
 */
const FREQUENCY_WINDOW_DAYS = 28

function frequencyTrend(executions: NormalizedExerciseExecution[]): ExerciseTrend {
  const sampleSize = executions.length
  if (sampleSize < MIN_SAMPLE_FOR_TREND) return insufficientTrend('frequency', sampleSize)

  const referenceTime = new Date(executions[0].performedAt).getTime()
  const recentCutoff = referenceTime - FREQUENCY_WINDOW_DAYS * 86_400_000
  const previousCutoff = referenceTime - FREQUENCY_WINDOW_DAYS * 2 * 86_400_000

  const currentValue = executions.filter((e) => new Date(e.performedAt).getTime() > recentCutoff).length
  const previousValue = executions.filter((e) => {
    const t = new Date(e.performedAt).getTime()
    return t <= recentCutoff && t > previousCutoff
  }).length

  if (previousValue === 0) {
    return {
      metric: 'frequency',
      direction: 'insufficient_data',
      currentValue,
      previousValue,
      sampleSize,
      explanation: 'Sem execuções na janela anterior de 28 dias para comparar',
    }
  }

  const percentageChange = ((currentValue - previousValue) / previousValue) * 100
  const direction: ExerciseTrendDirection =
    percentageChange > STABILITY_TOLERANCE_PERCENT
      ? 'increasing'
      : percentageChange < -STABILITY_TOLERANCE_PERCENT
        ? 'decreasing'
        : 'stable'

  return {
    metric: 'frequency',
    direction,
    currentValue,
    previousValue,
    percentageChange,
    sampleSize,
    explanation: `${currentValue} execuções nos últimos ${FREQUENCY_WINDOW_DAYS} dias vs. ${previousValue} nos ${FREQUENCY_WINDOW_DAYS} dias anteriores`,
  }
}

export function getExerciseTrends(exerciseId: string): ExerciseTrend[] {
  const executions = normalizeExerciseExecutions(exerciseId) // mais recente primeiro
  const chronological = [...executions].reverse()

  const loadValues = chronological.map((e) => maxOrZero(e.sets.map((s) => s.weight_kg)))
  const volumeValues = chronological.map((e) => e.totalVolumeKg)
  const repsValues = chronological.map((e) => (e.totalSets > 0 ? e.totalReps / e.totalSets : 0))

  return [
    windowTrend('load', loadValues),
    windowTrend('volume', volumeValues),
    windowTrend('reps', repsValues),
    frequencyTrend(executions),
  ]
}

// ─── Substitution Intelligence ─────────────────────────────────────────────────

interface SubstitutionEvent {
  plannedExerciseName: string
  replacementExerciseId: string
  replacementExerciseName: string
  reason?: string
  occurredAt: string
}

function collectSubstitutionEvents(history: CompletedWorkout[] = getWorkoutHistory()): SubstitutionEvent[] {
  const events: SubstitutionEvent[] = []
  for (const workout of history) {
    for (const record of workout.exercises) {
      if (!record.substitution) continue
      events.push({
        plannedExerciseName: record.substitution.plannedExerciseName,
        replacementExerciseId: record.exerciseId,
        replacementExerciseName: record.exerciseName,
        reason: record.substitution.reason,
        occurredAt: workout.completedAt,
      })
    }
  }
  return events
}

/**
 * Quantas vezes um exercício (por nome, ver cabeçalho do módulo) foi
 * substituído por outro.
 */
function countTimesSubstitutedOut(exerciseName: string, history: CompletedWorkout[] = getWorkoutHistory()): number {
  const target = normalizeExerciseName(exerciseName)
  return collectSubstitutionEvents(history).filter((e) => normalizeExerciseName(e.plannedExerciseName) === target).length
}

export interface ExerciseSubstitutionInsights {
  exerciseId: string
  exerciseName: string
  /** Vezes que este exercício foi substituído por outro. */
  timesReplaced: number
  /** Vezes que este exercício entrou como substituto de outro. */
  timesUsedAsReplacement: number
  /**
   * `timesReplaced / (timesReplaced + execuções planejadas realizadas sem substituição)`.
   * `undefined` sem nenhuma aparição planejada (nem substituída, nem direta) — não há base para uma taxa.
   */
  replacementRate?: number
  mostCommonReplacements: { exerciseId: string; exerciseName: string; count: number }[]
  mostCommonReasons: { reason: string; count: number }[]
  lastOccurrenceAt?: string
}

export function getExerciseSubstitutionInsights(exerciseId: string): ExerciseSubstitutionInsights | null {
  const history = getWorkoutHistory()
  const executions = normalizeExerciseExecutions(exerciseId, history)
  const events = collectSubstitutionEvents(history)

  const exerciseName = executions[0]?.exerciseName
  if (!exerciseName) return null

  const normalizedName = normalizeExerciseName(exerciseName)
  const replacingEvents = events.filter((e) => normalizeExerciseName(e.plannedExerciseName) === normalizedName)
  const usedAsReplacementEvents = executions.filter((e) => e.wasSubstitution)

  const plannedDirectExecutions = executions.filter((e) => e.plannedExerciseId && !e.wasSubstitution).length
  const plannedAppearances = replacingEvents.length + plannedDirectExecutions

  const replacementCounts = new Map<string, { exerciseId: string; exerciseName: string; count: number }>()
  for (const e of replacingEvents) {
    const key = e.replacementExerciseId
    const entry = replacementCounts.get(key) ?? { exerciseId: e.replacementExerciseId, exerciseName: e.replacementExerciseName, count: 0 }
    entry.count++
    replacementCounts.set(key, entry)
  }

  const reasonCounts = new Map<string, number>()
  for (const e of replacingEvents) {
    if (!e.reason) continue
    reasonCounts.set(e.reason, (reasonCounts.get(e.reason) ?? 0) + 1)
  }

  const lastOccurrenceAt = [...replacingEvents.map((e) => e.occurredAt), ...usedAsReplacementEvents.map((e) => e.performedAt)].sort(
    (a, b) => (a > b ? -1 : 1)
  )[0]

  return {
    exerciseId,
    exerciseName,
    timesReplaced: replacingEvents.length,
    timesUsedAsReplacement: usedAsReplacementEvents.length,
    replacementRate: plannedAppearances > 0 ? replacingEvents.length / plannedAppearances : undefined,
    mostCommonReplacements: Array.from(replacementCounts.values()).sort((a, b) => b.count - a.count),
    mostCommonReasons: Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    lastOccurrenceAt,
  }
}

/**
 * Agregação global (todo o histórico) usada por `recommendation-assembly.ts`
 * para alimentar a regra `review_exercise` com evidência real de
 * substituição recorrente (antes desta sprint, `recurringSubstitutions`
 * nunca era populado — ver Sprint 21 Parte 4B).
 */
export function getRecurringSubstitutions(history: CompletedWorkout[] = getWorkoutHistory()): { exerciseName: string; count: number }[] {
  const events = collectSubstitutionEvents(history)
  const counts = new Map<string, { exerciseName: string; count: number }>()
  for (const e of events) {
    const key = normalizeExerciseName(e.plannedExerciseName)
    const entry = counts.get(key) ?? { exerciseName: e.plannedExerciseName, count: 0 }
    entry.count++
    counts.set(key, entry)
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}
