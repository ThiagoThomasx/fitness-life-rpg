// Motor de progresso de metas — Sprint 18 (escopo reduzido).
// Módulo puro na leitura (não decide o que persistir), com uma única exceção
// documentada: `recordMilestoneReached` é chamado como efeito colateral
// idempotente sempre que um marco é cruzado, seguindo o mesmo padrão de
// detecção de PR (`exercise-records.ts`) — o app já registra "fatos
// históricos" assim que são observados, em vez de exigir um passo manual.
//
// Nunca promete resultado: toda projeção mostra amostra, confiança e método.
// Tipos suportados: exercise_weight, exercise_reps, estimated_1rm,
// weekly_sessions, consistency (mesmo recorte de `training-goals.ts`).

import { getWorkoutHistory } from './workout-history'
import { calculateEstimated1RM } from './exercise-records'
import { getWeekStart } from './weekly-plan'
import { getWeekEnd } from './training-load'
import { getMilestonesForGoal, recordMilestoneReached, MILESTONE_PERCENTAGES } from './training-goal-milestones'
import type { TrainingGoal } from './training-goals'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface GoalProgressConfig {
  minimumSamplesForProjection: number
  projectionWindowSessions: number
  lowConfidenceSampleThreshold: number
  highConfidenceSampleThreshold: number
  onTrackTolerancePercentage: number
}

export const DEFAULT_GOAL_PROGRESS_CONFIG: GoalProgressConfig = {
  minimumSamplesForProjection: 3,
  projectionWindowSessions: 8,
  lowConfidenceSampleThreshold: 4,
  highConfidenceSampleThreshold: 7,
  onTrackTolerancePercentage: 10,
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_track'
  | 'behind'
  | 'completed'
  | 'paused'
  | 'insufficient_data'

export type GoalConfidence = 'low' | 'medium' | 'high'

export interface GoalMilestoneProgress {
  percentage: number
  reachedAt: string | null
}

export interface GoalProjection {
  estimatedWeeksMin?: number
  estimatedWeeksMax?: number
  confidence: GoalConfidence
  method: 'linear_recent_trend' | 'insufficient_data'
  explanation: string
  sampleSize: number
}

export interface GoalProgress {
  goalId: string
  baselineValue?: number
  baselineInferred: boolean
  currentValue?: number
  targetValue?: number
  progressPercentage?: number
  status: GoalProgressStatus
  confidence: GoalConfidence
  headline: string
  explanation: string
  milestones: GoalMilestoneProgress[]
  projection?: GoalProjection
}

// ─── Helpers compartilhados ─────────────────────────────────────────────────────

interface ExerciseSession {
  date: string
  maxWeightKg: number
  maxReps: number
  bestRepsAtOrAboveWeight: (minWeightKg: number) => number
  estimated1RMKg: number | null
}

/** Sessões do exercício em ordem cronológica (mais antiga primeiro). */
function getExerciseSessionsChronological(exerciseId: string): ExerciseSession[] {
  const history = [...getWorkoutHistory()].reverse()
  const sessions: ExerciseSession[] = []

  for (const workout of history) {
    for (const ex of workout.exercises) {
      if (ex.exerciseId !== exerciseId || ex.sets.length === 0) continue
      const maxWeightKg = Math.max(...ex.sets.map((s) => s.weight_kg))
      const maxReps = Math.max(...ex.sets.map((s) => s.reps))
      const best1RMs = ex.sets
        .filter((s) => s.weight_kg > 0)
        .map((s) => calculateEstimated1RM(s.weight_kg, s.reps))
      sessions.push({
        date: workout.completedAt,
        maxWeightKg,
        maxReps,
        bestRepsAtOrAboveWeight: (minWeightKg: number) =>
          Math.max(0, ...ex.sets.filter((s) => s.weight_kg >= minWeightKg).map((s) => s.reps)),
        estimated1RMKg: best1RMs.length > 0 ? Math.max(...best1RMs) : null,
      })
    }
  }

  return sessions
}

function weeksBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime()
  return ms / (7 * 24 * 60 * 60 * 1000)
}

function confidenceFromSampleSize(sampleSize: number, config: GoalProgressConfig): GoalConfidence {
  if (sampleSize >= config.highConfidenceSampleThreshold) return 'high'
  if (sampleSize > config.lowConfidenceSampleThreshold) return 'medium'
  return 'low'
}

/**
 * Projeção linear simples a partir da série recente de valores. Nunca produz
 * uma data — apenas uma faixa de semanas, e só quando o ritmo é positivo e há
 * amostra mínima. Método único documentado: `linear_recent_trend`.
 */
function buildLinearProjection(
  series: { date: string; value: number }[],
  targetValue: number,
  config: GoalProgressConfig
): GoalProjection {
  const sampleSize = series.length
  if (sampleSize < config.minimumSamplesForProjection) {
    return {
      confidence: 'low',
      method: 'insufficient_data',
      explanation: `Ainda há poucas sessões registradas (${sampleSize}) para estimar um ritmo confiável.`,
      sampleSize,
    }
  }

  const windowed = series.slice(-config.projectionWindowSessions)
  const first = windowed[0]
  const last = windowed[windowed.length - 1]
  const elapsedWeeks = weeksBetween(first.date, last.date)
  const delta = last.value - first.value

  if (elapsedWeeks <= 0 || delta <= 0) {
    return {
      confidence: 'low',
      method: 'insufficient_data',
      explanation: 'O ritmo recente não é positivo o suficiente para estimar um prazo.',
      sampleSize,
    }
  }

  const ratePerWeek = delta / elapsedWeeks
  const remaining = targetValue - last.value
  if (remaining <= 0) {
    return {
      confidence: confidenceFromSampleSize(sampleSize, config),
      method: 'linear_recent_trend',
      explanation: 'A meta já foi alcançada com base no ritmo observado.',
      sampleSize,
    }
  }

  const estimatedWeeks = remaining / ratePerWeek
  const estimatedWeeksMin = Math.max(1, Math.round(estimatedWeeks * 0.75))
  const estimatedWeeksMax = Math.max(estimatedWeeksMin, Math.round(estimatedWeeks * 1.25))

  return {
    estimatedWeeksMin,
    estimatedWeeksMax,
    confidence: confidenceFromSampleSize(sampleSize, config),
    method: 'linear_recent_trend',
    explanation:
      `Mantendo um ritmo semelhante ao histórico recente, essa meta pode ficar ao alcance ` +
      `em aproximadamente ${estimatedWeeksMin}–${estimatedWeeksMax} semanas.`,
    sampleSize,
  }
}

/** Marca os percentuais recém-cruzados como atingidos e devolve o estado completo dos marcos. */
function resolveMilestones(goalId: string, progressPercentage: number | undefined): GoalMilestoneProgress[] {
  if (progressPercentage !== undefined) {
    for (const pct of MILESTONE_PERCENTAGES) {
      if (progressPercentage >= pct) recordMilestoneReached(goalId, pct)
    }
  }
  const reached = new Map(getMilestonesForGoal(goalId).map((m) => [m.percentage, m.reachedAt]))
  return MILESTONE_PERCENTAGES.map((pct) => ({ percentage: pct, reachedAt: reached.get(pct) ?? null }))
}

function progressStatusFromPercentage(pct: number, config: GoalProgressConfig): GoalProgressStatus {
  if (pct >= 100) return 'completed'
  if (pct <= 0) return 'not_started'
  if (pct >= 100 - config.onTrackTolerancePercentage) return 'on_track'
  return 'in_progress'
}

// ─── Metas de exercício (peso / 1RM) ────────────────────────────────────────────

function computeExerciseValueProgress(
  goal: TrainingGoal,
  now: Date,
  config: GoalProgressConfig,
  valueOf: (session: ExerciseSession) => number
): GoalProgress {
  const targetValue = goal.targetValue
  if (!goal.exerciseId || !targetValue) {
    return baseProgress(goal, 'insufficient_data', 'Meta incompleta — faltam dados do exercício ou do alvo.')
  }

  const sessions = getExerciseSessionsChronological(goal.exerciseId)
  const before = sessions.filter((s) => s.date <= goal.startDate)
  const since = sessions.filter((s) => s.date >= goal.startDate)

  let baselineValue: number | undefined = goal.baselineValue
  const baselineInferred = goal.baselineValue === undefined

  if (baselineValue === undefined) {
    if (before.length > 0) {
      baselineValue = Math.max(...before.map(valueOf))
    } else if (since.length > 0) {
      baselineValue = valueOf(since[0])
    }
  }

  if (baselineValue === undefined) {
    return {
      goalId: goal.id,
      baselineInferred: true,
      targetValue,
      status: 'not_started',
      confidence: 'low',
      headline: 'Ainda sem primeira execução registrada.',
      explanation: 'Assim que este exercício for registrado, a meta passa a acompanhar o progresso automaticamente.',
      milestones: resolveMilestones(goal.id, undefined),
    }
  }

  const currentValue = since.length > 0 ? Math.max(baselineValue, ...since.map(valueOf)) : baselineValue
  const progressRange = targetValue - baselineValue
  const progressPercentage =
    progressRange <= 0
      ? 100
      : Math.max(0, Math.min(100, Math.round(((currentValue - baselineValue) / progressRange) * 100)))

  const status = progressStatusFromPercentage(progressPercentage, config)
  const series = since.map((s) => ({ date: s.date, value: valueOf(s) }))
  const projection = status === 'completed' ? undefined : buildLinearProjection(series, targetValue, config)

  return {
    goalId: goal.id,
    baselineValue,
    baselineInferred,
    currentValue,
    targetValue,
    progressPercentage,
    status,
    confidence: confidenceFromSampleSize(since.length, config),
    headline: `${currentValue.toFixed(1)} kg de ${targetValue} kg`,
    explanation: baselineInferred
      ? 'Baseline inferida a partir do histórico existente antes da criação da meta.'
      : 'Baseline definida manualmente ao criar a meta.',
    milestones: resolveMilestones(goal.id, progressPercentage),
    projection,
  }
}

// ─── Meta de repetições (carga + reps combinadas) ───────────────────────────────

function computeExerciseRepsProgress(goal: TrainingGoal, config: GoalProgressConfig): GoalProgress {
  const targetWeight = goal.targetValue
  const targetReps = goal.targetReps
  if (!goal.exerciseId || !targetWeight || !targetReps) {
    return baseProgress(goal, 'insufficient_data', 'Meta incompleta — faltam dados do exercício ou do alvo.')
  }

  const sessions = getExerciseSessionsChronological(goal.exerciseId)
  const since = sessions.filter((s) => s.date >= goal.startDate)
  const attemptsAtTarget = since
    .map((s) => ({ date: s.date, reps: s.bestRepsAtOrAboveWeight(targetWeight) }))
    .filter((a) => a.reps > 0)

  if (attemptsAtTarget.length === 0) {
    return {
      goalId: goal.id,
      baselineValue: 0,
      baselineInferred: true,
      targetValue: targetReps,
      status: sessions.length === 0 ? 'not_started' : 'in_progress',
      confidence: 'low',
      headline: `Ainda não realizado com ${targetWeight} kg ou mais.`,
      explanation: 'A meta será concluída quando a carga e as repetições-alvo forem atingidas na mesma série.',
      milestones: resolveMilestones(goal.id, 0),
    }
  }

  const currentReps = Math.max(...attemptsAtTarget.map((a) => a.reps))
  const progressPercentage = Math.max(0, Math.min(100, Math.round((currentReps / targetReps) * 100)))
  const status = progressStatusFromPercentage(progressPercentage, config)
  const series = attemptsAtTarget.map((a) => ({ date: a.date, value: a.reps }))
  const projection = status === 'completed' ? undefined : buildLinearProjection(series, targetReps, config)

  return {
    goalId: goal.id,
    baselineValue: 0,
    baselineInferred: true,
    currentValue: currentReps,
    targetValue: targetReps,
    progressPercentage,
    status,
    confidence: confidenceFromSampleSize(attemptsAtTarget.length, config),
    headline: `${currentReps} de ${targetReps} reps com ${targetWeight} kg`,
    explanation: 'Progresso calculado apenas com séries realizadas na carga-alvo ou acima dela.',
    milestones: resolveMilestones(goal.id, progressPercentage),
    projection,
  }
}

// ─── Metas de frequência semanal / consistência ─────────────────────────────────

interface WeekOutcome {
  weekStart: string
  weekEnd: string
  sessionCount: number
  isComplete: boolean
  isSuccessful: boolean
}

function computeWeeklyOutcomes(goal: TrainingGoal, now: Date): WeekOutcome[] {
  const targetSessions = goal.targetValue ?? 0
  const targetWeeks = goal.targetWeeks ?? 0
  const history = getWorkoutHistory()
  const outcomes: WeekOutcome[] = []

  let cursor = getWeekStart(new Date(goal.startDate + 'T12:00:00'))
  for (let i = 0; i < targetWeeks; i++) {
    const weekEnd = getWeekEnd(cursor)
    const isComplete = weekEnd < now.toISOString().slice(0, 10)
    const sessionCount = history.filter((w) => w.completedAt >= cursor && w.completedAt <= `${weekEnd}T23:59:59.999Z`).length
    outcomes.push({
      weekStart: cursor,
      weekEnd,
      sessionCount,
      isComplete,
      isSuccessful: sessionCount >= targetSessions,
    })
    const next = new Date(cursor + 'T12:00:00')
    next.setDate(next.getDate() + 7)
    cursor = next.toISOString().slice(0, 10)
  }

  return outcomes
}

function computeFrequencyProgress(goal: TrainingGoal, now: Date, config: GoalProgressConfig): GoalProgress {
  const targetWeeks = goal.targetWeeks
  const targetSessions = goal.targetValue
  if (!targetWeeks || !targetSessions) {
    return baseProgress(goal, 'insufficient_data', 'Meta incompleta — faltam frequência-alvo ou duração.')
  }

  const outcomes = computeWeeklyOutcomes(goal, now)
  const elapsedWeeks = outcomes.filter((w) => w.isComplete)
  const successfulWeeks = elapsedWeeks.filter((w) => w.isSuccessful).length
  const currentWeek = outcomes.find((w) => !w.isComplete)

  const progressPercentage = Math.max(0, Math.min(100, Math.round((successfulWeeks / targetWeeks) * 100)))
  const status: GoalProgressStatus =
    successfulWeeks >= targetWeeks
      ? 'completed'
      : elapsedWeeks.length === 0
        ? 'not_started'
        : progressStatusFromPercentage(progressPercentage, config)

  const headline = `${successfulWeeks} de ${targetWeeks} semanas concluídas`
  const explanationParts = [`Meta de ${targetSessions} sessões por semana.`]
  if (currentWeek) {
    explanationParts.push(`Semana atual em andamento (${currentWeek.sessionCount}/${targetSessions} até agora) — não contabilizada como falha antes do fim da semana.`)
  }

  return {
    goalId: goal.id,
    baselineValue: 0,
    baselineInferred: true,
    currentValue: successfulWeeks,
    targetValue: targetWeeks,
    progressPercentage,
    status,
    confidence: confidenceFromSampleSize(elapsedWeeks.length, config),
    headline,
    explanation: explanationParts.join(' '),
    milestones: resolveMilestones(goal.id, progressPercentage),
  }
}

// ─── Fallback comum ──────────────────────────────────────────────────────────────

function baseProgress(goal: TrainingGoal, status: GoalProgressStatus, explanation: string): GoalProgress {
  return {
    goalId: goal.id,
    baselineInferred: true,
    status,
    confidence: 'low',
    headline: 'Dados insuficientes',
    explanation,
    milestones: resolveMilestones(goal.id, undefined),
  }
}

// ─── Entrada principal ───────────────────────────────────────────────────────────

export function calculateGoalProgress(
  goal: TrainingGoal,
  now: Date = new Date(),
  config: GoalProgressConfig = DEFAULT_GOAL_PROGRESS_CONFIG
): GoalProgress {
  if (goal.status === 'paused') {
    return { ...baseProgress(goal, 'paused', 'Meta pausada — retome para voltar a acompanhar o progresso.') }
  }
  if (goal.status === 'completed') {
    return {
      goalId: goal.id,
      baselineInferred: false,
      status: 'completed',
      confidence: 'high',
      headline: 'Meta concluída',
      explanation: goal.completedAt ? `Concluída em ${goal.completedAt.slice(0, 10)}.` : 'Meta concluída.',
      milestones: resolveMilestones(goal.id, 100),
    }
  }

  switch (goal.type) {
    case 'exercise_weight':
      return computeExerciseValueProgress(goal, now, config, (s) => s.maxWeightKg)
    case 'estimated_1rm':
      return computeExerciseValueProgress(goal, now, config, (s) => s.estimated1RMKg ?? 0)
    case 'exercise_reps':
      return computeExerciseRepsProgress(goal, config)
    case 'weekly_sessions':
    case 'consistency':
      return computeFrequencyProgress(goal, now, config)
    default:
      return baseProgress(goal, 'insufficient_data', 'Tipo de meta não suportado nesta versão.')
  }
}
