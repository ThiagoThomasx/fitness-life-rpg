// Motor de análise de ciclos de treino — Sprint 17.
// Toda lógica é pura e derivada; reutiliza os motores das Sprints 11-16 em vez
// de recalcular volume, muscle groups, PRs ou prontidão.

import { getWorkoutHistory } from './workout-history'
import { getCustomWorkouts, getAllExercises } from './custom-workouts'
import { normalizeMuscleGroups, MUSCLE_GROUP_LABELS } from './muscle-groups'
import { calculateVolumeKg, calculateEstimated1RM } from './exercise-records'
import { getWeekStart } from './weekly-plan'
import {
  getWeekEnd,
  sessionVolumeKg,
  sessionTotalSets,
  sessionTotalReps,
  getSessionPrimaryMuscleGroups,
  ALL_MUSCLE_GROUPS,
} from './training-load'
import { getCheckIns } from './readiness-check-ins'
import { computeReadinessStats } from './workout-readiness'
import type { TrainingCycle } from './training-cycles'
import type { MuscleGroup } from './muscle-groups'
import type { CompletedWorkout } from './workout-history'

// ─── Config ───────────────────────────────────────────────────────────────────

const MIN_SESSIONS_FOR_EXERCISE_TREND = 2
const REGRESSION_THRESHOLD_KG = 2.5
const MIN_WEEKS_FOR_VOLUME_TREND = 3
const TREND_CHANGE_TOLERANCE_PCT = 10

// ─── Types ────────────────────────────────────────────────────────────────────

export type CycleTrend = 'increasing' | 'stable' | 'decreasing' | 'mixed' | 'insufficient_data'

export interface CycleExerciseSummary {
  exerciseId: string
  exerciseName: string
  firstWeightKg: number | null
  lastWeightKg: number | null
  firstEstimated1RMKg: number | null
  lastEstimated1RMKg: number | null
  firstVolumeKg: number | null
  lastVolumeKg: number | null
  sessions: number
  prs: number
  status: 'improving' | 'stable' | 'stagnant' | 'regressing' | 'insufficient_data'
}

export interface CycleMuscleGroupSummary {
  muscleGroup: MuscleGroup
  label: string
  totalSessions: number
  totalSets: number
  totalVolumeKg: number
  averageWeeklySets: number
  averageWeeklyVolumeKg: number
}

export interface TrainingCycleSummary {
  cycleId: string
  startDate: string
  endDate: string
  completedWeeks: number
  plannedWeeks?: number

  totalSessions: number
  plannedSessions: number
  freeSessions: number

  totalVolumeKg: number
  averageWeeklyVolumeKg: number
  totalSets: number
  totalReps: number

  totalPrs: number
  averageReadiness: number | null
  adjustedSessions: number

  muscleGroups: CycleMuscleGroupSummary[]
  exercises: CycleExerciseSummary[]

  trend: CycleTrend
}

// ─── Date range helpers ─────────────────────────────────────────────────────

/** Data efetiva de término: `completedAt` se o ciclo já foi encerrado, senão hoje. */
function resolveEndDate(cycle: TrainingCycle, now: Date): string {
  if (cycle.completedAt) return cycle.completedAt.slice(0, 10)
  return now.toISOString().slice(0, 10)
}

function inRange(dateStr: string, start: string, end: string): boolean {
  const date = dateStr.slice(0, 10)
  return date >= start && date <= end
}

/** Número de semanas (Monday-start, inclusive) entre o início do ciclo e a data final. */
function countWeeks(startDate: string, endDate: string): number {
  const start = getWeekStart(new Date(startDate + 'T00:00:00'))
  const end = getWeekStart(new Date(endDate + 'T00:00:00'))
  const diffMs = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()
  return Math.floor(diffMs / (7 * 86400000)) + 1
}

// ─── Weekly volume series (for trend) ────────────────────────────────────────

/**
 * Série de volume semanal usada para tendência. Só inclui semanas
 * inteiramente decorridas até `endDate` — a semana corrente de um ciclo
 * ativo ainda não terminou de acumular volume e não deve ser comparada
 * como se fosse uma queda.
 */
function buildWeeklyVolumeSeries(
  workouts: CompletedWorkout[],
  startDate: string,
  endDate: string
): number[] {
  const weekStarts: string[] = []
  let cursor = getWeekStart(new Date(startDate + 'T00:00:00'))
  const lastWeekStart = getWeekStart(new Date(endDate + 'T00:00:00'))
  while (cursor <= lastWeekStart) {
    if (getWeekEnd(cursor) <= endDate) weekStarts.push(cursor)
    const d = new Date(cursor + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    cursor = d.toISOString().slice(0, 10)
  }

  return weekStarts.map((weekStart) => {
    const weekEnd = getWeekEnd(weekStart)
    return workouts
      .filter((w) => inRange(w.completedAt, weekStart, weekEnd))
      .reduce((sum, w) => sum + sessionVolumeKg(w), 0)
  })
}

function classifyTrend(weeklyVolumes: number[]): CycleTrend {
  const weeksWithData = weeklyVolumes.filter((v) => v > 0).length
  if (weeksWithData < MIN_WEEKS_FOR_VOLUME_TREND) return 'insufficient_data'

  let increases = 0
  let decreases = 0
  for (let i = 1; i < weeklyVolumes.length; i++) {
    const prev = weeklyVolumes[i - 1]
    const curr = weeklyVolumes[i]
    if (prev === 0) continue
    const changePct = ((curr - prev) / prev) * 100
    if (changePct > TREND_CHANGE_TOLERANCE_PCT) increases++
    else if (changePct < -TREND_CHANGE_TOLERANCE_PCT) decreases++
  }

  if (increases > 0 && decreases > 0) return 'mixed'
  if (increases > 0) return 'increasing'
  if (decreases > 0) return 'decreasing'
  return 'stable'
}

// ─── Exercise summaries ──────────────────────────────────────────────────────

function buildExerciseSummaries(workouts: CompletedWorkout[]): CycleExerciseSummary[] {
  // Percorre do mais antigo para o mais recente para achar primeira/última execução no ciclo.
  const chronological = [...workouts].reverse()
  const byExercise = new Map<
    string,
    { name: string; sets: { weightKg: number; volumeKg: number; oneRm: number | null }[]; prs: number }
  >()

  for (const w of chronological) {
    for (const ex of w.exercises) {
      if (ex.sets.length === 0) continue
      const entry = byExercise.get(ex.exerciseId) ?? { name: ex.exerciseName, sets: [], prs: 0 }
      const maxWeight = Math.max(...ex.sets.map((s) => s.weight_kg))
      const bestSet = ex.sets.reduce((best, s) => (s.weight_kg > best.weight_kg ? s : best), ex.sets[0])
      const oneRm = bestSet.weight_kg > 0 ? calculateEstimated1RM(bestSet.weight_kg, bestSet.reps) : null
      entry.sets.push({ weightKg: maxWeight, volumeKg: calculateVolumeKg(ex.sets), oneRm })
      if (ex.isWeightPr || ex.isRepsPr || ex.isVolumePr || ex.isFirstTime) entry.prs++
      byExercise.set(ex.exerciseId, entry)
    }
  }

  const summaries: CycleExerciseSummary[] = []
  for (const [exerciseId, { name, sets, prs }] of Array.from(byExercise.entries())) {
    const first = sets[0]
    const last = sets[sets.length - 1]
    const deltaKg = last.weightKg - first.weightKg

    let status: CycleExerciseSummary['status']
    if (sets.length < MIN_SESSIONS_FOR_EXERCISE_TREND) {
      status = 'insufficient_data'
    } else if (deltaKg > 0) {
      status = 'improving'
    } else if (deltaKg === 0) {
      status = 'stable'
    } else if (Math.abs(deltaKg) >= REGRESSION_THRESHOLD_KG) {
      status = 'regressing'
    } else {
      status = 'stagnant'
    }

    summaries.push({
      exerciseId,
      exerciseName: name,
      firstWeightKg: first.weightKg,
      lastWeightKg: last.weightKg,
      firstEstimated1RMKg: first.oneRm,
      lastEstimated1RMKg: last.oneRm,
      firstVolumeKg: first.volumeKg,
      lastVolumeKg: last.volumeKg,
      sessions: sets.length,
      prs,
      status,
    })
  }

  return summaries.sort((a, b) => b.sessions - a.sessions)
}

// ─── Muscle group summaries ──────────────────────────────────────────────────

function buildMuscleGroupSummaries(
  workouts: CompletedWorkout[],
  weeksElapsed: number,
  allExercises: ReturnType<typeof getAllExercises>
): CycleMuscleGroupSummary[] {
  const weeks = Math.max(1, weeksElapsed)
  const summaries: CycleMuscleGroupSummary[] = []

  for (const mg of ALL_MUSCLE_GROUPS) {
    let totalSessions = 0
    let totalSets = 0
    let totalVolumeKg = 0

    for (const w of workouts) {
      const primary = getSessionPrimaryMuscleGroups(w, allExercises)
      if (!primary.includes(mg)) continue
      totalSessions++
      for (const ex of w.exercises) {
        const exDef = allExercises.find((e) => e.id === ex.exerciseId)
        if (!exDef) continue
        if (normalizeMuscleGroups(exDef.muscle_groups)[0] !== mg) continue
        totalSets += ex.sets.length
        totalVolumeKg += calculateVolumeKg(ex.sets)
      }
    }

    if (totalSessions === 0) continue

    summaries.push({
      muscleGroup: mg,
      label: MUSCLE_GROUP_LABELS[mg],
      totalSessions,
      totalSets,
      totalVolumeKg,
      averageWeeklySets: Math.round((totalSets / weeks) * 10) / 10,
      averageWeeklyVolumeKg: Math.round(totalVolumeKg / weeks),
    })
  }

  return summaries.sort((a, b) => b.totalVolumeKg - a.totalVolumeKg)
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildCycleSummary(cycle: TrainingCycle, now: Date = new Date()): TrainingCycleSummary {
  const startDate = cycle.startDate
  const endDate = resolveEndDate(cycle, now)

  const history = getWorkoutHistory()
  const cycleWorkouts = history.filter((w) => inRange(w.completedAt, startDate, endDate))

  const customWorkoutIds = new Set(getCustomWorkouts().map((cw) => cw.id))
  const allExercises = getAllExercises()

  const totalSessions = cycleWorkouts.length
  const freeSessions = cycleWorkouts.filter((w) => !customWorkoutIds.has(w.workoutId)).length
  const plannedSessions = totalSessions - freeSessions

  const totalVolumeKg = cycleWorkouts.reduce((sum, w) => sum + sessionVolumeKg(w), 0)
  const totalSets = cycleWorkouts.reduce((sum, w) => sum + sessionTotalSets(w), 0)
  const totalReps = cycleWorkouts.reduce((sum, w) => sum + sessionTotalReps(w), 0)
  const totalPrs = cycleWorkouts.reduce((sum, w) => sum + w.prsCount, 0)
  const adjustedSessions = cycleWorkouts.filter(
    (w) => w.appliedSessionAdjustment && w.appliedSessionAdjustment.mode !== 'original'
  ).length

  const completedWeeks = countWeeks(startDate, endDate)
  const averageWeeklyVolumeKg = Math.round(totalVolumeKg / Math.max(1, completedWeeks))

  const checkInsInRange = getCheckIns().filter((c) => inRange(c.createdAt, startDate, endDate))
  const readinessStats = computeReadinessStats(checkInsInRange)
  const averageReadiness =
    checkInsInRange.length === 0
      ? null
      : Math.round(
          ((readinessStats.averageEnergy +
            readinessStats.averageSleep +
            (6 - readinessStats.averageSoreness) +
            readinessStats.averageMotivation) /
            4) *
            10
        ) / 10

  const weeklyVolumes = buildWeeklyVolumeSeries(cycleWorkouts, startDate, endDate)
  const trend = classifyTrend(weeklyVolumes)

  return {
    cycleId: cycle.id,
    startDate,
    endDate,
    completedWeeks,
    plannedWeeks: cycle.plannedWeeks,
    totalSessions,
    plannedSessions,
    freeSessions,
    totalVolumeKg,
    averageWeeklyVolumeKg,
    totalSets,
    totalReps,
    totalPrs,
    averageReadiness,
    adjustedSessions,
    muscleGroups: buildMuscleGroupSummaries(cycleWorkouts, completedWeeks, allExercises),
    exercises: buildExerciseSummaries(cycleWorkouts),
    trend,
  }
}
