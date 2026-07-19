// Progresso de metas de volume semanal — Sprint 18.1a.
// Mesmo modelo de janela fixa de `computeFrequencyProgress` (training-goal-progress.ts):
// a meta cobre exatamente `targetWeeks` semanas a partir de `startDate`. Usa
// apenas volume real registrado (nunca planejado) e nunca conta a semana
// corrente (incompleta) como falha.

import { getWorkoutHistory } from './workout-history'
import { getWeekStart } from './weekly-plan'
import { getWeekEnd, sessionVolumeKg } from './training-load'
import {
  baseProgress,
  confidenceFromSampleSize,
  progressStatusFromPercentage,
  resolveMilestones,
  type GoalProgress,
  type GoalProgressConfig,
  type GoalProgressStatus,
} from './training-goal-progress'
import type { TrainingGoal } from './training-goals'

interface VolumeWeekOutcome {
  weekStart: string
  weekEnd: string
  volumeKg: number
  isComplete: boolean
  isSuccessful: boolean
}

function computeVolumeWeekOutcomes(goal: TrainingGoal, now: Date): VolumeWeekOutcome[] {
  const targetWeeklyVolumeKg = goal.targetWeeklyVolumeKg ?? 0
  const targetWeeks = goal.targetWeeks ?? 0
  const history = getWorkoutHistory()
  const outcomes: VolumeWeekOutcome[] = []

  let cursor = getWeekStart(new Date(goal.startDate + 'T12:00:00'))
  for (let i = 0; i < targetWeeks; i++) {
    const weekEnd = getWeekEnd(cursor)
    const isComplete = weekEnd < now.toISOString().slice(0, 10)
    const volumeKg = history
      .filter((w) => w.completedAt >= cursor && w.completedAt <= `${weekEnd}T23:59:59.999Z`)
      .reduce((sum, w) => sum + sessionVolumeKg(w), 0)
    outcomes.push({
      weekStart: cursor,
      weekEnd,
      volumeKg,
      isComplete,
      isSuccessful: volumeKg >= targetWeeklyVolumeKg,
    })
    const next = new Date(cursor + 'T12:00:00')
    next.setDate(next.getDate() + 7)
    cursor = next.toISOString().slice(0, 10)
  }

  return outcomes
}

/** Maior sequência de semanas bem-sucedidas consecutivas, em ordem cronológica. */
function longestConsecutiveStreak(outcomes: VolumeWeekOutcome[]): number {
  let longest = 0
  let current = 0
  for (const week of outcomes) {
    if (week.isSuccessful) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }
  return longest
}

export function computeWeeklyVolumeProgress(goal: TrainingGoal, now: Date, config: GoalProgressConfig): GoalProgress {
  const targetWeeklyVolumeKg = goal.targetWeeklyVolumeKg
  const targetWeeks = goal.targetWeeks
  if (!targetWeeklyVolumeKg || !targetWeeks) {
    return baseProgress(goal, 'insufficient_data', 'Meta incompleta — faltam volume-alvo ou duração.')
  }

  const outcomes = computeVolumeWeekOutcomes(goal, now)
  const elapsedWeeks = outcomes.filter((w) => w.isComplete)
  const currentWeek = outcomes.find((w) => !w.isComplete)

  const successfulWeeks = goal.consecutiveWeeks
    ? longestConsecutiveStreak(elapsedWeeks)
    : elapsedWeeks.filter((w) => w.isSuccessful).length

  const progressPercentage = Math.max(0, Math.min(100, Math.round((successfulWeeks / targetWeeks) * 100)))
  const status: GoalProgressStatus =
    successfulWeeks >= targetWeeks
      ? 'completed'
      : elapsedWeeks.length === 0
        ? 'not_started'
        : progressStatusFromPercentage(progressPercentage, config)

  const headline = goal.consecutiveWeeks
    ? `${successfulWeeks} de ${targetWeeks} semanas consecutivas com volume-alvo`
    : `${successfulWeeks} de ${targetWeeks} semanas com volume-alvo`
  const explanationParts = [
    `Meta de ${targetWeeklyVolumeKg} kg por semana` + (goal.consecutiveWeeks ? ', em semanas consecutivas.' : '.'),
  ]
  if (currentWeek) {
    explanationParts.push(
      `Semana atual em andamento (${Math.round(currentWeek.volumeKg)}/${targetWeeklyVolumeKg} kg até agora) — não contabilizada como falha antes do fim da semana.`
    )
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
