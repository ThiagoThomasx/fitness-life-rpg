// Exercise Detail Engine — Sprint 22 Parte 2.
//
// Extensão pura de `exercise-intelligence.ts` para alimentar a página
// `/exercicios/[id]`: resolução do exercício, qualidade dos dados, treinos
// relacionados e séries prontas para gráfico. Separado em arquivo próprio
// para manter `exercise-intelligence.ts` (motor da Parte 1) dentro do limite
// de tamanho de arquivo do projeto — nada aqui recalcula o que o motor da
// Parte 1 já expõe, só compõe em cima dele.

import { getWorkoutHistory, type CompletedWorkout } from './workout-history'
import { calculateEstimated1RM } from './exercise-records'
import { getAllExercises } from './custom-workouts'
import type { Exercise } from '@/types/database'
import {
  normalizeExerciseExecutions,
  getExerciseTimeline,
  type NormalizedExerciseExecution,
} from './exercise-intelligence'

/** Mesmo mínimo usado pelo motor de tendências (`MIN_SAMPLE_FOR_TREND` em `exercise-intelligence.ts`) — mantido em sincronia manualmente pois não é exportado. */
const MIN_SAMPLE_FOR_TREND = 6

// ─── Resolução do exercício (Sprint 22 Parte 2 — §7) ──────────────────────────
//
// Ordem de resolução: 1. biblioteca atual (`getAllExercises`, já mescla mock +
// customizados); 2. presença apenas no histórico (`ExerciseRecord.exerciseId`
// não está mais no catálogo — exercício removido ou nunca esteve no catálogo,
// ex. `exerciseId` de template legado). Não existe conceito de "arquivado"
// para exercícios no código atual (só treinos/programas têm arquivamento) —
// por isso `ExerciseAvailability` é binário (`active`/`removed`), não
// inventamos um terceiro estado sem suporte real (Sprint 22 §5.5).

export type ExerciseOrigin = 'library' | 'custom' | 'history_only'
export type ExerciseAvailability = 'active' | 'removed'

export interface ResolvedExercise {
  exerciseId: string
  exerciseName: string
  origin: ExerciseOrigin
  availability: ExerciseAvailability
  muscleGroups?: string[]
  equipment?: string[]
  workoutTypeId?: string
}

/**
 * Resolve um exercício por ID. Retorna `null` apenas quando não há NENHUMA
 * evidência (nem catálogo, nem histórico) — a página de detalhe usa isso
 * para decidir entre "não encontrado" e "não está mais na biblioteca, mas
 * tem histórico" (Sprint 22 §7).
 */
export function resolveExercise(
  exerciseId: string,
  history: CompletedWorkout[] = getWorkoutHistory()
): ResolvedExercise | null {
  const catalogMatch = getAllExercises().find((ex: Exercise) => ex.id === exerciseId)
  if (catalogMatch) {
    return {
      exerciseId: catalogMatch.id,
      exerciseName: catalogMatch.name,
      origin: catalogMatch.id.startsWith('cx-') ? 'custom' : 'library',
      availability: 'active',
      muscleGroups: catalogMatch.muscle_groups,
      equipment: catalogMatch.equipment,
      workoutTypeId: catalogMatch.workout_type_id,
    }
  }

  const executions = normalizeExerciseExecutions(exerciseId, history)
  if (executions.length > 0) {
    return {
      exerciseId,
      exerciseName: executions[0].exerciseName,
      origin: 'history_only',
      availability: 'removed',
    }
  }

  return null
}

// ─── Data Quality (Sprint 22 §11) ─────────────────────────────────────────────

export type ExerciseDataQualityStatus =
  | 'no_data'
  | 'single_execution'
  | 'no_load_recorded'
  | 'partial_history'
  | 'full_history'

export interface ExerciseDataQuality {
  status: ExerciseDataQualityStatus
  explanation: string
}

/**
 * Explica, sem tom de alerta, por que certos gráficos/recordes/tendências
 * podem não aparecer. `no_load_recorded` cobre exercícios de peso corporal
 * (todas as séries com `weight_kg === 0`) — não é erro, é a natureza do
 * exercício.
 */
export function getExerciseDataQuality(exerciseId: string): ExerciseDataQuality {
  const executions = normalizeExerciseExecutions(exerciseId)

  if (executions.length === 0) {
    return { status: 'no_data', explanation: 'Este exercício ainda não possui execuções registradas.' }
  }
  if (executions.length === 1) {
    return {
      status: 'single_execution',
      explanation: 'Apenas uma execução registrada — recordes já são válidos, mas tendências exigem mais histórico.',
    }
  }

  const hasAnyLoad = executions.some((e) => e.sets.some((s) => s.weight_kg > 0))
  if (!hasAnyLoad) {
    return {
      status: 'no_load_recorded',
      explanation: 'Nenhuma carga registrada (exercício de peso corporal ou sem peso informado) — gráficos de carga e volume não são exibidos.',
    }
  }

  if (executions.length < MIN_SAMPLE_FOR_TREND) {
    return {
      status: 'partial_history',
      explanation: `Histórico parcial (${executions.length} execuções) — algumas tendências exigem pelo menos ${MIN_SAMPLE_FOR_TREND}.`,
    }
  }

  return { status: 'full_history', explanation: 'Histórico completo o suficiente para recordes, tendências e gráficos.' }
}

// ─── Programas e treinos relacionados (Sprint 22 §25) ─────────────────────────

export interface ExerciseRelatedWorkout {
  key: string
  workoutName: string
  programId?: string
  programWeekNumber?: number
  /** Presente quando ao menos uma execução veio de um treino planejado — permite link de volta (Sprint 22 §25/§27). */
  plannedWorkoutId?: string
  occurrences: number
  lastPerformedAt: string
}

/**
 * Agrupa execuções por (programa + treino) — hierarquia Programa → treino →
 * quantidade de execuções pedida na spec. Treinos livres (sem `programId`)
 * agrupam só por nome do treino.
 */
export function getExerciseRelatedWorkouts(exerciseId: string): ExerciseRelatedWorkout[] {
  const executions = normalizeExerciseExecutions(exerciseId)
  const groups = new Map<string, ExerciseRelatedWorkout>()

  for (const exec of executions) {
    const key = `${exec.programId ?? 'free'}::${exec.workoutName}`
    const existing = groups.get(key)
    if (existing) {
      existing.occurrences++
      if (exec.performedAt > existing.lastPerformedAt) existing.lastPerformedAt = exec.performedAt
      if (!existing.plannedWorkoutId && exec.plannedWorkoutId) existing.plannedWorkoutId = exec.plannedWorkoutId
      continue
    }
    groups.set(key, {
      key,
      workoutName: exec.workoutName,
      programId: exec.programId,
      programWeekNumber: exec.programWeekNumber,
      plannedWorkoutId: exec.plannedWorkoutId,
      occurrences: 1,
      lastPerformedAt: exec.performedAt,
    })
  }

  return Array.from(groups.values()).sort((a, b) => (a.lastPerformedAt > b.lastPerformedAt ? -1 : 1))
}

export interface ProgramExerciseAppearance {
  exerciseId: string
  exerciseName: string
  occurrences: number
  lastPerformedAt: string
}

/**
 * Inverso de `getExerciseRelatedWorkouts`: dado um programa, quais
 * exercícios apareceram nele. Usado pela página de programa (Sprint 22 §25,
 * item obrigatório #5) — a página de programa hoje não tem granularidade de
 * exercício, só resumo operacional (`program-progress.ts`), então esta
 * função fica no motor de detalhe do exercício em vez de duplicar em
 * `program-progress.ts`.
 */
export function getExercisesForProgram(
  programId: string,
  history: CompletedWorkout[] = getWorkoutHistory()
): ProgramExerciseAppearance[] {
  const groups = new Map<string, ProgramExerciseAppearance>()
  for (const workout of history) {
    if (workout.source?.programId !== programId) continue
    for (const record of workout.exercises) {
      const existing = groups.get(record.exerciseId)
      if (existing) {
        existing.occurrences++
        if (workout.completedAt > existing.lastPerformedAt) existing.lastPerformedAt = workout.completedAt
        continue
      }
      groups.set(record.exerciseId, {
        exerciseId: record.exerciseId,
        exerciseName: record.exerciseName,
        occurrences: 1,
        lastPerformedAt: workout.completedAt,
      })
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.occurrences - a.occurrences)
}

// ─── Séries para gráficos (Sprint 22 §16/§17/§18) ─────────────────────────────
//
// Cada função retorna pontos já prontos para o eixo temporal — nada é
// recalculado no componente React, só formatado/plotado (Sprint 22 §3).
// Execuções sem valor válido para a métrica são omitidas (§16.3, §17).

export type ExercisePeriodFilter = '30d' | '90d' | '6m' | '1y' | 'all'

const PERIOD_DAYS: Record<Exclude<ExercisePeriodFilter, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '6m': 182,
  '1y': 365,
}

/**
 * Filtra execuções por janela temporal a partir da execução mais recente do
 * conjunto (não da data real do sistema) — mesma convenção determinística de
 * `frequencyTrend` (`exercise-intelligence.ts`). `'all'` retorna tudo sem
 * alterar contagem/recorde absoluto (Sprint 22 §18).
 */
export function filterExecutionsByPeriod(
  executions: NormalizedExerciseExecution[],
  period: ExercisePeriodFilter
): NormalizedExerciseExecution[] {
  if (period === 'all' || executions.length === 0) return executions
  const mostRecent = Math.max(...executions.map((e) => new Date(e.performedAt).getTime()))
  const cutoff = mostRecent - PERIOD_DAYS[period] * 86_400_000
  return executions.filter((e) => new Date(e.performedAt).getTime() >= cutoff)
}

export interface ExerciseChartPoint {
  workoutId: string
  performedAt: string
  workoutName: string
  value: number
  /** Contexto adicional para tooltip — carga/reps da série que gerou o valor, quando aplicável. */
  supportingLoadKg?: number
  supportingReps?: number
}

/** Carga por execução — maior carga válida (`weight_kg > 0`) da execução (Sprint 22 §16.1). */
export function getExerciseLoadSeries(exerciseId: string, period: ExercisePeriodFilter = 'all'): ExerciseChartPoint[] {
  const executions = filterExecutionsByPeriod(getExerciseTimeline(exerciseId, 'oldest_first'), period)
  const points: ExerciseChartPoint[] = []
  for (const exec of executions) {
    const loaded = exec.sets.filter((s) => s.weight_kg > 0)
    if (loaded.length === 0) continue
    const best = loaded.reduce((a, b) => (b.weight_kg > a.weight_kg ? b : a))
    points.push({ workoutId: exec.workoutId, performedAt: exec.performedAt, workoutName: exec.workoutName, value: best.weight_kg, supportingReps: best.reps })
  }
  return points
}

/** Estimativa de 1RM por execução — melhor série (maior 1RM estimado) (Sprint 22 §16.2). Reaproveita `calculateEstimated1RM`. */
export function getExercise1RMSeries(exerciseId: string, period: ExercisePeriodFilter = 'all'): ExerciseChartPoint[] {
  const executions = filterExecutionsByPeriod(getExerciseTimeline(exerciseId, 'oldest_first'), period)
  const points: ExerciseChartPoint[] = []
  for (const exec of executions) {
    let best: { value: number; weight: number; reps: number } | null = null
    for (const set of exec.sets) {
      const estimate = calculateEstimated1RM(set.weight_kg, set.reps)
      if (estimate <= 0) continue
      if (!best || estimate > best.value) best = { value: estimate, weight: set.weight_kg, reps: set.reps }
    }
    if (!best) continue
    points.push({
      workoutId: exec.workoutId,
      performedAt: exec.performedAt,
      workoutName: exec.workoutName,
      value: Math.round(best.value * 10) / 10,
      supportingLoadKg: best.weight,
      supportingReps: best.reps,
    })
  }
  return points
}

/** Volume total por execução — omite sessões sem volume válido (Sprint 22 §16.3). */
export function getExerciseVolumeSeries(exerciseId: string, period: ExercisePeriodFilter = 'all'): ExerciseChartPoint[] {
  const executions = filterExecutionsByPeriod(getExerciseTimeline(exerciseId, 'oldest_first'), period)
  return executions
    .filter((e) => e.totalVolumeKg > 0)
    .map((e) => ({ workoutId: e.workoutId, performedAt: e.performedAt, workoutName: e.workoutName, value: e.totalVolumeKg }))
}

/**
 * Repetições por execução — definição escolhida: total de repetições da
 * execução (soma de todas as séries), não "melhor série", para refletir
 * volume de trabalho em reps de forma consistente com `totalReps` já exposto
 * em `NormalizedExerciseExecution` (Sprint 22 §16.4 — decisão documentada).
 */
export function getExerciseRepsSeries(exerciseId: string, period: ExercisePeriodFilter = 'all'): ExerciseChartPoint[] {
  const executions = filterExecutionsByPeriod(getExerciseTimeline(exerciseId, 'oldest_first'), period)
  return executions
    .filter((e) => e.totalReps > 0)
    .map((e) => ({ workoutId: e.workoutId, performedAt: e.performedAt, workoutName: e.workoutName, value: e.totalReps }))
}

export interface ExerciseFrequencyPoint {
  weekStart: string
  count: number
}

/**
 * Execuções por semana (múltiplos de 7 dias a partir da execução mais antiga
 * do período filtrado) — janela temporal clara, sempre relativa ao próprio
 * histórico, nunca à data real do sistema (Sprint 22 §16.5).
 */
export function getExerciseFrequencySeries(exerciseId: string, period: ExercisePeriodFilter = 'all'): ExerciseFrequencyPoint[] {
  const executions = filterExecutionsByPeriod(getExerciseTimeline(exerciseId, 'oldest_first'), period)
  if (executions.length === 0) return []

  const start = new Date(executions[0].performedAt).getTime()
  const buckets = new Map<number, number>()
  for (const exec of executions) {
    const t = new Date(exec.performedAt).getTime()
    const weekIndex = Math.floor((t - start) / (7 * 86_400_000))
    buckets.set(weekIndex, (buckets.get(weekIndex) ?? 0) + 1)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekIndex, count]) => ({
      weekStart: new Date(start + weekIndex * 7 * 86_400_000).toISOString(),
      count,
    }))
}
