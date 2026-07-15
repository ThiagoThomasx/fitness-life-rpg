// Motor de gestão de carga semanal — Sprint 16.
// Toda lógica é pura e derivada; nada é persistido por este módulo.
// Fonte única de verdade para volume, frequência e distribuição semanal.

import { getWorkoutHistory } from './workout-history'
import { getCustomWorkouts } from './custom-workouts'
import { getAllExercises } from './custom-workouts'
import { normalizeMuscleGroups, MUSCLE_GROUP_LABELS } from './muscle-groups'
import { calculateVolumeKg } from './exercise-records'
import { getWeekStart } from './weekly-plan'
import { getCurrentWeekPlan } from './weekly-plan'
import { getSkippedWorkoutIds } from './session-plan-changes'
import type { MuscleGroup } from './muscle-groups'
import type { CompletedWorkout } from './workout-history'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface TrainingLoadConfig {
  weekStartsOn: 0 | 1
  minimumSessionsForAnalysis: number
  minimumHoursBetweenSameMuscleGroup: number
  highConcentrationHours: number
  volumeIncreaseWarningPercentage: number
  volumeDecreasePercentage: number
  minimumWeeklySetsForRepresentation: number
  highWeeklySetsThreshold: number
  secondaryMuscleWeight: number
  comparisonWindowWeeks: number
}

export const DEFAULT_TRAINING_LOAD_CONFIG: TrainingLoadConfig = {
  weekStartsOn: 1,
  minimumSessionsForAnalysis: 2,
  minimumHoursBetweenSameMuscleGroup: 48,
  highConcentrationHours: 24,
  volumeIncreaseWarningPercentage: 20,
  volumeDecreasePercentage: 20,
  minimumWeeklySetsForRepresentation: 6,
  highWeeklySetsThreshold: 20,
  secondaryMuscleWeight: 0,
  comparisonWindowWeeks: 4,
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MuscleGroupStatus =
  | 'balanced'
  | 'high_concentration'
  | 'underrepresented'
  | 'not_planned'
  | 'insufficient_data'

export interface MuscleGroupWeeklyLoad {
  muscleGroup: MuscleGroup
  label: string
  completedSessions: number
  totalSets: number
  totalReps: number
  totalVolumeKg: number
  lastTrainedAt: string | null
  status: MuscleGroupStatus
  concentrationWarning: boolean
}

export type WeeklyTrainingStatus =
  | 'on_track'
  | 'under_plan'
  | 'high_concentration'
  | 'imbalanced'
  | 'completed'
  | 'insufficient_data'

export interface WeeklyTrainingPriority {
  type:
    | 'complete_planned_session'
    | 'increase_recovery_time'
    | 'balance_muscle_groups'
    | 'maintain_current_plan'
    | 'review_volume'
    | 'resume_consistency'
    | 'insufficient_data'
  priority: 'low' | 'medium' | 'high'
  title: string
  explanation: string
  relatedMuscleGroup?: string
  relatedWorkoutId?: string
}

export interface PlanAdherenceSummary {
  planned: number
  completedFromPlan: number
  freeSessions: number
  skipped: number
  completionRate: number
  status: 'complete' | 'on_track' | 'behind' | 'not_planned' | 'insufficient_data'
}

export interface WeeklyComparison {
  previousWeekVolume: number
  volumeChangePct: number | null
  previousWeekSessions: number
  sessionsChange: number
  previousWeekSets: number
  setsChangePct: number | null
}

export interface CompletedSessionSummary {
  id: string
  workoutId: string
  workoutName: string
  completedAt: string
  volumeKg: number
  totalSets: number
  totalReps: number
  primaryMuscleGroups: MuscleGroup[]
  wasAdjusted: boolean
  readinessLevel: string | null
  isFreeSession: boolean
}

export interface TrainingWeek {
  startDate: string
  endDate: string
  completedSessions: CompletedSessionSummary[]
  skippedWorkoutIds: string[]
  totalPlannedSessions: number
  totalCompletedSessions: number
  totalFreeSessions: number
  completionRate: number
  plannedVolumeKg: null
  completedVolumeKg: number
  totalSets: number
  totalReps: number
  muscleGroups: MuscleGroupWeeklyLoad[]
  status: WeeklyTrainingStatus
  priorities: WeeklyTrainingPriority[]
  adherence: PlanAdherenceSummary
  comparison: WeeklyComparison | null
  averageReadiness: number | null
  adjustedSessionsCount: number
}

// ─── Week boundaries ──────────────────────────────────────────────────────────

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

export function getWeekBoundaries(
  date: Date = new Date()
): { startDate: string; endDate: string } {
  const startDate = getWeekStart(date)
  const endDate = getWeekEnd(startDate)
  return { startDate, endDate }
}

export function getPreviousWeekStart(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function inWeek(dateStr: string, startDate: string, endDate: string): boolean {
  const date = dateStr.slice(0, 10)
  return date >= startDate && date <= endDate
}

// ─── Volume helpers ───────────────────────────────────────────────────────────

function sessionVolumeKg(workout: CompletedWorkout): number {
  return workout.exercises.reduce(
    (sum, ex) => sum + calculateVolumeKg(ex.sets),
    0
  )
}

function sessionTotalSets(workout: CompletedWorkout): number {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
}

function sessionTotalReps(workout: CompletedWorkout): number {
  return workout.exercises.reduce(
    (sum, ex) => ex.sets.reduce((s, set) => s + set.reps, sum),
    0
  )
}

// ─── Primary muscle group resolution ─────────────────────────────────────────

// Volume is attributed exclusively to the primary muscle group (first canonical
// group after normalization) to prevent double-counting across groups.

// For a completed workout, derive primary muscle groups from the actual
// exercises performed (using ExerciseRecord.exerciseId to look up muscle groups).
function getSessionPrimaryMuscleGroups(
  workout: CompletedWorkout,
  allExercises: ReturnType<typeof getAllExercises>
): MuscleGroup[] {
  const groups = new Set<MuscleGroup>()
  for (const exRecord of workout.exercises) {
    const ex = allExercises.find((e) => e.id === exRecord.exerciseId)
    if (!ex) continue
    const normalized = normalizeMuscleGroups(ex.muscle_groups)
    if (normalized[0]) groups.add(normalized[0])
  }
  return Array.from(groups)
}

// ─── Concentration detection ──────────────────────────────────────────────────

// Returns true if any two sessions for the same muscle group are less than
// `highConcentrationHours` apart within the week.
function detectConcentration(
  sessions: CompletedSessionSummary[],
  muscleGroup: MuscleGroup,
  config: TrainingLoadConfig
): boolean {
  const times = sessions
    .filter((s) => s.primaryMuscleGroups.includes(muscleGroup))
    .map((s) => new Date(s.completedAt).getTime())
    .sort((a, b) => a - b)

  for (let i = 1; i < times.length; i++) {
    const diffHours = (times[i] - times[i - 1]) / 3600000
    if (diffHours < config.highConcentrationHours) return true
  }
  return false
}

// ─── Muscle group loads ───────────────────────────────────────────────────────

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'peito', 'costas', 'pernas', 'ombros', 'biceps', 'triceps', 'core',
]

function buildMuscleGroupLoads(
  sessions: CompletedSessionSummary[],
  allExercises: ReturnType<typeof getAllExercises>,
  weekWorkouts: CompletedWorkout[],
  config: TrainingLoadConfig
): MuscleGroupWeeklyLoad[] {
  const loads: MuscleGroupWeeklyLoad[] = []

  for (const mg of ALL_MUSCLE_GROUPS) {
    const mgSessions = sessions.filter((s) => s.primaryMuscleGroups.includes(mg))

    let totalSets = 0
    let totalReps = 0
    let totalVolumeKg = 0

    for (const s of mgSessions) {
      const workout = weekWorkouts.find((w) => w.id === s.id)
      if (!workout) continue
      for (const ex of workout.exercises) {
        const ex_ = allExercises.find((e) => e.id === ex.exerciseId)
        if (!ex_) continue
        const normalized = normalizeMuscleGroups(ex_.muscle_groups)
        if (normalized[0] !== mg) continue
        totalSets += ex.sets.length
        totalReps += ex.sets.reduce((s, set) => s + set.reps, 0)
        totalVolumeKg += calculateVolumeKg(ex.sets)
      }
    }

    const lastTrainedAt =
      mgSessions.length > 0
        ? mgSessions.sort(
            (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          )[0].completedAt
        : null

    const concentrationWarning = detectConcentration(sessions, mg, config)

    let status: MuscleGroupStatus
    if (mgSessions.length === 0) {
      status = 'not_planned'
    } else if (concentrationWarning) {
      status = 'high_concentration'
    } else if (totalSets < config.minimumWeeklySetsForRepresentation) {
      status = 'underrepresented'
    } else if (totalSets >= config.highWeeklySetsThreshold) {
      status = 'balanced'
    } else {
      status = 'balanced'
    }

    loads.push({
      muscleGroup: mg,
      label: MUSCLE_GROUP_LABELS[mg],
      completedSessions: mgSessions.length,
      totalSets,
      totalReps,
      totalVolumeKg,
      lastTrainedAt,
      status,
      concentrationWarning,
    })
  }

  return loads
}

// ─── Weekly status ────────────────────────────────────────────────────────────

function computeWeeklyStatus(
  completedCount: number,
  plannedCount: number,
  muscleLoads: MuscleGroupWeeklyLoad[],
  config: TrainingLoadConfig,
  history: CompletedWorkout[]
): WeeklyTrainingStatus {
  if (history.length < config.minimumSessionsForAnalysis) return 'insufficient_data'
  if (plannedCount > 0 && completedCount >= plannedCount) return 'completed'
  if (muscleLoads.some((m) => m.concentrationWarning)) return 'high_concentration'
  if (
    plannedCount > 0 &&
    completedCount < Math.ceil(plannedCount / 2)
  ) {
    return 'under_plan'
  }
  return 'on_track'
}

// ─── Priorities ───────────────────────────────────────────────────────────────

const MAX_PRIORITIES = 3

function computePriorities(
  week: {
    completedCount: number
    plannedCount: number
    muscleLoads: MuscleGroupWeeklyLoad[]
    comparison: WeeklyComparison | null
    skippedIds: string[]
    customWorkouts: ReturnType<typeof getCustomWorkouts>
  },
  config: TrainingLoadConfig
): WeeklyTrainingPriority[] {
  const priorities: WeeklyTrainingPriority[] = []

  if (week.plannedCount === 0 && week.completedCount === 0) {
    priorities.push({
      type: 'insufficient_data',
      priority: 'low',
      title: 'Nenhum treino registrado esta semana',
      explanation: 'Registre treinos para começar a ver análises de distribuição e prioridades.',
    })
    return priorities
  }

  // Concentration warning takes highest priority
  const concentrated = week.muscleLoads.filter((m) => m.concentrationWarning)
  for (const mg of concentrated.slice(0, 1)) {
    priorities.push({
      type: 'increase_recovery_time',
      priority: 'high',
      title: `Dê mais intervalo ao treino de ${mg.label.toLowerCase()}`,
      explanation: `${mg.label} recebeu estímulos em sessões muito próximas esta semana. Considere distribuir melhor nos próximos dias.`,
      relatedMuscleGroup: mg.muscleGroup,
    })
  }

  // Pending planned sessions
  if (week.plannedCount > 0 && week.completedCount < week.plannedCount) {
    const remaining = week.plannedCount - week.completedCount
    priorities.push({
      type: 'complete_planned_session',
      priority: remaining >= 2 ? 'high' : 'medium',
      title: `${remaining} ${remaining === 1 ? 'sessão pendente' : 'sessões pendentes'} esta semana`,
      explanation: `Você planejou ${week.plannedCount} treinos e concluiu ${week.completedCount}. Ainda há sessões para realizar.`,
    })
  }

  // Volume spike vs. previous week
  if (
    week.comparison &&
    week.comparison.volumeChangePct !== null &&
    week.comparison.volumeChangePct > config.volumeIncreaseWarningPercentage
  ) {
    priorities.push({
      type: 'review_volume',
      priority: 'medium',
      title: 'Volume acima da semana anterior',
      explanation: `Seu volume está ${Math.round(week.comparison.volumeChangePct)}% acima da semana passada. Considere se o aumento é intencional.`,
    })
  }

  // Underrepresented muscle groups (only if user has enough sessions to analyze)
  if (week.completedCount >= config.minimumSessionsForAnalysis) {
    const undertrained = week.muscleLoads.filter(
      (m) => m.completedSessions > 0 && m.status === 'underrepresented'
    )
    if (undertrained.length > 0) {
      priorities.push({
        type: 'balance_muscle_groups',
        priority: 'low',
        title: 'Grupos musculares com pouco volume',
        explanation: `${undertrained.map((m) => m.label).join(', ')} receberam menos séries do que o esperado esta semana.`,
        relatedMuscleGroup: undertrained[0].muscleGroup,
      })
    }
  }

  // On track — positive reinforcement
  if (
    priorities.length === 0 &&
    week.completedCount > 0 &&
    (week.plannedCount === 0 || week.completedCount >= week.plannedCount)
  ) {
    priorities.push({
      type: 'maintain_current_plan',
      priority: 'low',
      title: 'Sua semana está bem distribuída',
      explanation: 'Continue seguindo o ritmo atual.',
    })
  }

  return priorities.slice(0, MAX_PRIORITIES)
}

// ─── Plan adherence ───────────────────────────────────────────────────────────

function computeAdherence(
  completed: CompletedSessionSummary[],
  plannedCount: number,
  skippedIds: string[],
  customWorkoutIds: Set<string>
): PlanAdherenceSummary {
  const completedFromPlan = completed.filter((s) => customWorkoutIds.has(s.workoutId)).length
  const freeSessions = completed.filter((s) => !customWorkoutIds.has(s.workoutId)).length
  const skipped = skippedIds.length
  const total = completed.length

  if (plannedCount === 0) {
    return {
      planned: 0,
      completedFromPlan,
      freeSessions,
      skipped,
      completionRate: 0,
      status: 'not_planned',
    }
  }

  const completionRate = Math.min(1, total / plannedCount)
  let status: PlanAdherenceSummary['status']

  if (total >= plannedCount) {
    status = 'complete'
  } else if (completionRate >= 0.5) {
    status = 'on_track'
  } else {
    status = 'behind'
  }

  return {
    planned: plannedCount,
    completedFromPlan,
    freeSessions,
    skipped,
    completionRate,
    status,
  }
}

// ─── Week comparison ──────────────────────────────────────────────────────────

function computeComparison(
  currentVolume: number,
  currentSessions: number,
  currentSets: number,
  history: CompletedWorkout[],
  startDate: string
): WeeklyComparison | null {
  const prevStart = getPreviousWeekStart(startDate)
  const prevEnd = getWeekEnd(prevStart)

  const prevWorkouts = history.filter(
    (w) => inWeek(w.completedAt, prevStart, prevEnd)
  )
  if (prevWorkouts.length === 0) return null

  const prevVolume = prevWorkouts.reduce((sum, w) => sum + sessionVolumeKg(w), 0)
  const prevSets = prevWorkouts.reduce((sum, w) => sum + sessionTotalSets(w), 0)

  const volumeChangePct = prevVolume > 0
    ? ((currentVolume - prevVolume) / prevVolume) * 100
    : null

  const setsChangePct = prevSets > 0
    ? ((currentSets - prevSets) / prevSets) * 100
    : null

  return {
    previousWeekVolume: prevVolume,
    volumeChangePct,
    previousWeekSessions: prevWorkouts.length,
    sessionsChange: currentSessions - prevWorkouts.length,
    previousWeekSets: prevSets,
    setsChangePct,
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildTrainingWeek(
  date: Date = new Date(),
  config: TrainingLoadConfig = DEFAULT_TRAINING_LOAD_CONFIG
): TrainingWeek {
  const { startDate, endDate } = getWeekBoundaries(date)
  const history = getWorkoutHistory()
  const weekWorkouts = history.filter((w) => inWeek(w.completedAt, startDate, endDate))
  const allExercises = getAllExercises()
  const customWorkouts = getCustomWorkouts()
  const customWorkoutIds = new Set(customWorkouts.map((cw) => cw.id))
  const skippedWorkoutIds = getSkippedWorkoutIds(startDate)

  // Build session summaries
  const completedSessions: CompletedSessionSummary[] = weekWorkouts.map((w) => ({
    id: w.id,
    workoutId: w.workoutId,
    workoutName: w.workoutName,
    completedAt: w.completedAt,
    volumeKg: sessionVolumeKg(w),
    totalSets: sessionTotalSets(w),
    totalReps: sessionTotalReps(w),
    primaryMuscleGroups: getSessionPrimaryMuscleGroups(w, allExercises),
    wasAdjusted:
      !!w.appliedSessionAdjustment && w.appliedSessionAdjustment.mode !== 'original',
    readinessLevel: null,
    isFreeSession: !customWorkoutIds.has(w.workoutId),
  }))

  const totalCompletedSessions = completedSessions.length
  const totalFreeSessions = completedSessions.filter((s) => s.isFreeSession).length
  const completedVolumeKg = completedSessions.reduce((sum, s) => sum + s.volumeKg, 0)
  const totalSets = completedSessions.reduce((sum, s) => sum + s.totalSets, 0)
  const totalReps = completedSessions.reduce((sum, s) => sum + s.totalReps, 0)
  const adjustedSessionsCount = completedSessions.filter((s) => s.wasAdjusted).length

  // Planned count from weekly plan goal or custom workouts count
  const weekPlan = getCurrentWeekPlan()
  const totalPlannedSessions = weekPlan?.goals.workouts ?? 0

  const completionRate = totalPlannedSessions > 0
    ? Math.min(1, totalCompletedSessions / totalPlannedSessions)
    : 0

  // Muscle group loads
  const muscleGroups = buildMuscleGroupLoads(
    completedSessions, allExercises, weekWorkouts, config
  )

  // Status
  const status = computeWeeklyStatus(
    totalCompletedSessions,
    totalPlannedSessions,
    muscleGroups,
    config,
    history
  )

  // Comparison with previous week
  const comparison = computeComparison(
    completedVolumeKg,
    totalCompletedSessions,
    totalSets,
    history,
    startDate
  )

  // Plan adherence
  const adherence = computeAdherence(
    completedSessions,
    totalPlannedSessions,
    skippedWorkoutIds,
    customWorkoutIds
  )

  // Priorities
  const priorities = computePriorities(
    {
      completedCount: totalCompletedSessions,
      plannedCount: totalPlannedSessions,
      muscleLoads: muscleGroups,
      comparison,
      skippedIds: skippedWorkoutIds,
      customWorkouts,
    },
    config
  )

  return {
    startDate,
    endDate,
    completedSessions,
    skippedWorkoutIds,
    totalPlannedSessions,
    totalCompletedSessions,
    totalFreeSessions,
    completionRate,
    plannedVolumeKg: null,
    completedVolumeKg,
    totalSets,
    totalReps,
    muscleGroups,
    status,
    priorities,
    adherence,
    comparison,
    averageReadiness: null,
    adjustedSessionsCount,
  }
}

// ─── Historical weeks ─────────────────────────────────────────────────────────

export interface WeekSummary {
  startDate: string
  endDate: string
  totalSessions: number
  totalVolumeKg: number
  totalSets: number
  prsCount: number
  averageReadiness: number | null
  completionRate: number
  adjustedSessions: number
}

export function getWeekSummaries(
  weeksBack: number = 4
): WeekSummary[] {
  const history = getWorkoutHistory()
  const summaries: WeekSummary[] = []

  const now = new Date()
  for (let i = 0; i < weeksBack; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const startDate = getWeekStart(d)
    const endDate = getWeekEnd(startDate)
    const weekPlan = i === 0 ? getCurrentWeekPlan() : null

    const workouts = history.filter((w) => inWeek(w.completedAt, startDate, endDate))
    const planned = weekPlan?.goals.workouts ?? 0

    summaries.push({
      startDate,
      endDate,
      totalSessions: workouts.length,
      totalVolumeKg: workouts.reduce((sum, w) => sum + sessionVolumeKg(w), 0),
      totalSets: workouts.reduce((sum, w) => sum + sessionTotalSets(w), 0),
      prsCount: workouts.reduce((sum, w) => sum + w.prsCount, 0),
      averageReadiness: null,
      completionRate: planned > 0 ? Math.min(1, workouts.length / planned) : 0,
      adjustedSessions: workouts.filter(
        (w) => w.appliedSessionAdjustment && w.appliedSessionAdjustment.mode !== 'original'
      ).length,
    })
  }

  return summaries
}

// ─── Profile aggregates ───────────────────────────────────────────────────────

export interface WeeklyAggregateStats {
  averageSessionsPerWeek: number
  averageVolumeKgPerWeek: number
  averageCompletionRate: number
  mostTrainedMuscleGroup: MuscleGroup | null
  mostTrainedMuscleGroupLabel: string | null
  totalFreeSessionsAllTime: number
  weeksWithData: number
}

export function getWeeklyAggregateStats(weeksBack: number = 12): WeeklyAggregateStats {
  const summaries = getWeekSummaries(weeksBack)
  const withData = summaries.filter((s) => s.totalSessions > 0)

  if (withData.length === 0) {
    return {
      averageSessionsPerWeek: 0,
      averageVolumeKgPerWeek: 0,
      averageCompletionRate: 0,
      mostTrainedMuscleGroup: null,
      mostTrainedMuscleGroupLabel: null,
      totalFreeSessionsAllTime: 0,
      weeksWithData: 0,
    }
  }

  const avgSessions = withData.reduce((s, w) => s + w.totalSessions, 0) / withData.length
  const avgVolume = withData.reduce((s, w) => s + w.totalVolumeKg, 0) / withData.length
  const avgCompletion = withData.reduce((s, w) => s + w.completionRate, 0) / withData.length

  // Most trained muscle group across all history
  const history = getWorkoutHistory()
  const allExercises = getAllExercises()
  const groupCounts: Partial<Record<MuscleGroup, number>> = {}

  for (const w of history) {
    for (const ex of w.exercises) {
      const ex_ = allExercises.find((e) => e.id === ex.exerciseId)
      if (!ex_) continue
      const primary = normalizeMuscleGroups(ex_.muscle_groups)[0]
      if (!primary) continue
      groupCounts[primary] = (groupCounts[primary] ?? 0) + ex.sets.length
    }
  }

  let mostTrained: MuscleGroup | null = null
  let maxSets = 0
  for (const [mg, sets] of Object.entries(groupCounts) as [MuscleGroup, number][]) {
    if (sets > maxSets) {
      maxSets = sets
      mostTrained = mg
    }
  }

  const customWorkoutIds = new Set(getCustomWorkouts().map((cw) => cw.id))
  const totalFreeSessionsAllTime = history.filter(
    (w) => !customWorkoutIds.has(w.workoutId)
  ).length

  return {
    averageSessionsPerWeek: Math.round(avgSessions * 10) / 10,
    averageVolumeKgPerWeek: Math.round(avgVolume),
    averageCompletionRate: Math.round(avgCompletion * 100),
    mostTrainedMuscleGroup: mostTrained,
    mostTrainedMuscleGroupLabel: mostTrained ? MUSCLE_GROUP_LABELS[mostTrained] : null,
    totalFreeSessionsAllTime,
    weeksWithData: withData.length,
  }
}
