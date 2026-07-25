// Ponte entre storage e o motor puro de recomendações — Sprint 21 Parte 4A.
// Único módulo que lê localStorage para montar `AdaptiveRecommendationInput`;
// o cálculo em si continua inteiramente em `adaptive-recommendations.ts`.

import { getWorkoutHistory } from './workout-history'
import { getRecentCheckIns } from './readiness-check-ins'
import { computeReadinessStats } from './workout-readiness'
import { buildProgramAdherenceSnapshot } from './program-progress'
import { resolvedExercisesFromPlannedWorkout, buildPlannedPerformedComparison } from './planned-performed-comparison'
import type { PlannedWorkout } from './planned-workouts'
import type { TrainingProgram } from './training-programs'
import { generateAdaptiveRecommendations, type AdaptivePlanRecommendation } from './adaptive-recommendations'
import { filterActiveRecommendations } from './adaptive-recommendation-decisions'

const RECENT_WINDOW_DAYS = 14

function daysAgo(days: number, today: string): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * Monta o input do motor a partir de dados reais do programa e gera as
 * recomendações ativas (já filtradas por decisões anteriores do usuário).
 * Substituições recorrentes ficam de fora: `CompletedWorkout` não persiste
 * substituições de exercício hoje (ver pendência da Parte 3) — sem esse
 * dado, a regra `review_exercise` nunca é avaliada aqui, o que é o
 * comportamento correto (não inventar evidência que não existe).
 */
export function buildProgramRecommendations(
  program: Pick<TrainingProgram, 'id' | 'version' | 'weeks' | 'blocks'>,
  planned: PlannedWorkout[],
  today: string,
  currentWeekNumber: number
): AdaptivePlanRecommendation[] {
  const completed = getWorkoutHistory()
  const snapshot = buildProgramAdherenceSnapshot(program, planned, completed, today)
  const windowStart = daysAgo(RECENT_WINDOW_DAYS, today)

  const programItems = planned.filter(
    (pw) => pw.source?.programId === program.id && pw.date >= windowStart && pw.date <= today
  )
  const plannedSessionsInWindow = programItems.length
  const skippedSessionsInWindow = programItems.filter((pw) => pw.status === 'skipped').length

  const completedById = new Map(completed.map((w) => [w.id, w]))
  const volumeRates: number[] = []
  const checkInIds = new Set<string>()

  for (const pw of programItems) {
    if (pw.status !== 'done' || !pw.execution?.completedWorkoutId) continue
    const cw = completedById.get(pw.execution.completedWorkoutId)
    if (!cw) continue
    if (cw.checkInId) checkInIds.add(cw.checkInId)

    const comparison = buildPlannedPerformedComparison(pw, resolvedExercisesFromPlannedWorkout(pw), cw, today)
    const { plannedVolume, performedVolume } = comparison.sessionSummary
    if (plannedVolume !== undefined && plannedVolume > 0 && performedVolume !== undefined) {
      volumeRates.push(Math.min(1, performedVolume / plannedVolume))
    }
  }
  const volumeCompletionRate =
    volumeRates.length > 0 ? volumeRates.reduce((a, b) => a + b, 0) / volumeRates.length : undefined

  const recentCheckIns = getRecentCheckIns(RECENT_WINDOW_DAYS).filter((c) => checkInIds.has(c.id))
  const readinessStats = recentCheckIns.length > 0 ? computeReadinessStats(recentCheckIns) : undefined

  const recommendations = generateAdaptiveRecommendations({
    windowKey: `${program.id}-w${currentWeekNumber}`,
    programAdherenceRate: snapshot.adherenceRate,
    volumeCompletionRate,
    plannedSessionsInWindow,
    skippedSessionsInWindow,
    readinessStats,
  })

  return filterActiveRecommendations(recommendations)
}
