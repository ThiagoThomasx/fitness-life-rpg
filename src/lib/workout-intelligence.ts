import { getExerciseHistory, getWorkoutHistory } from './workout-history'
import { calculateVolumeKg } from './exercise-records'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkoutRecommendation {
  type: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload' | 'insufficient_data'
  suggestedWeight?: number
  suggestedReps?: number
  confidence: 'low' | 'medium' | 'high'
  reason: string
}

export type ExerciseStatus = 'improving' | 'stable' | 'stagnant' | 'regressing' | 'insufficient_data'

export interface ExerciseIntelligence {
  exerciseId: string
  exerciseName: string
  status: ExerciseStatus
  recommendation: WorkoutRecommendation
  sessionsAnalyzed: number
  daysSinceLastSession: number | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface ProgressionConfig {
  targetRepsMin: number
  targetRepsMax: number
  stagnationThreshold: number
  regressionThreshold: number
}

const DEFAULT_CONFIG: ProgressionConfig = {
  targetRepsMin: 10,
  targetRepsMax: 12,
  stagnationThreshold: 5,
  regressionThreshold: 3,
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function weightIncrement(weightKg: number): number {
  if (weightKg < 20) return 1
  if (weightKg <= 60) return 2.5
  return 5
}

function roundToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment
}

export function suggestWeightIncrease(currentWeightKg: number): number {
  const inc = weightIncrement(currentWeightKg)
  return roundToIncrement(currentWeightKg + inc, inc)
}

function bestWeightInSession(sets: Array<{ weight_kg: number; reps: number }>): number {
  return sets.reduce((max, s) => Math.max(max, s.weight_kg), 0)
}

function bestRepsInSession(sets: Array<{ weight_kg: number; reps: number }>): number {
  return sets.reduce((max, s) => Math.max(max, s.reps), 0)
}

function allSetsHitTarget(
  sets: Array<{ weight_kg: number; reps: number }>,
  targetReps: number
): boolean {
  return sets.length > 0 && sets.every((s) => s.reps >= targetReps)
}

function daysBetween(isoA: string, isoB: string): number {
  const msPerDay = 86400000
  return Math.round(Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) / msPerDay)
}

// ─── Core logic ───────────────────────────────────────────────────────────────

function detectStagnation(
  weights: number[],
  threshold: number
): boolean {
  if (weights.length < threshold) return false
  const last = weights.slice(0, threshold)
  return last.every((w) => w === last[0])
}

function detectRegression(
  weights: number[],
  threshold: number
): boolean {
  if (weights.length < threshold) return false
  const last = weights.slice(0, threshold)
  for (let i = 0; i < last.length - 1; i++) {
    if (last[i] >= last[i + 1]) return false
  }
  return true
}

function detectImprovement(weights: number[], minSessions: number): boolean {
  if (weights.length < minSessions) return false
  const last = weights.slice(0, minSessions)
  for (let i = 0; i < last.length - 1; i++) {
    if (last[i] <= last[i + 1]) return false
  }
  return true
}

// ─── Main recommendation function ────────────────────────────────────────────

export function generateRecommendation(
  exerciseId: string,
  config: ProgressionConfig = DEFAULT_CONFIG
): WorkoutRecommendation {
  const history = getExerciseHistory(exerciseId)

  if (history.length === 0) {
    return {
      type: 'insufficient_data',
      confidence: 'low',
      reason: 'Nenhum histórico encontrado para este exercício.',
    }
  }

  const lastRecord = history[0]
  const lastSets = lastRecord.sets

  if (lastSets.length === 0) {
    return {
      type: 'insufficient_data',
      confidence: 'low',
      reason: 'Último registro não contém séries.',
    }
  }

  const lastWeight = bestWeightInSession(lastSets)
  const lastReps = bestRepsInSession(lastSets)

  if (history.length === 1) {
    // Single session: low confidence recommendation
    if (lastWeight > 0 && allSetsHitTarget(lastSets, config.targetRepsMin)) {
      const suggested = suggestWeightIncrease(lastWeight)
      return {
        type: 'increase_weight',
        suggestedWeight: suggested,
        suggestedReps: config.targetRepsMin,
        confidence: 'low',
        reason: `Primeira sessão atingiu as reps alvo. Tente ${suggested}kg na próxima.`,
      }
    }
    if (lastWeight > 0) {
      const nextReps = Math.min(lastReps + 1, config.targetRepsMax)
      return {
        type: 'increase_reps',
        suggestedWeight: lastWeight,
        suggestedReps: nextReps,
        confidence: 'low',
        reason: `Continue com ${lastWeight}kg e tente ${nextReps} reps.`,
      }
    }
    const nextReps = Math.min((lastReps || 8) + 2, 25)
    return {
      type: 'increase_reps',
      suggestedReps: nextReps,
      confidence: 'low',
      reason: `Tente ${nextReps} reps hoje.`,
    }
  }

  // Multi-session analysis
  const weights = history.map((r) => bestWeightInSession(r.sets))
  const confidence = history.length >= 3 ? 'high' : 'medium'

  // Bodyweight exercises
  if (lastWeight === 0) {
    const allReps = history.map((r) => bestRepsInSession(r.sets))
    const isImprovingReps = allReps[0] > allReps[1]
    const isStagnantReps = allReps.slice(0, config.stagnationThreshold).every((r) => r === allReps[0])
    if (isStagnantReps && allReps.length >= config.stagnationThreshold) {
      const nextReps = allReps[0] + 2
      return {
        type: 'increase_reps',
        suggestedReps: nextReps,
        confidence,
        reason: `Estagnado em ${allReps[0]} reps por várias sessões. Tente forçar ${nextReps} reps.`,
      }
    }
    if (isImprovingReps) {
      const nextReps = Math.min(allReps[0] + 1, 30)
      return {
        type: 'increase_reps',
        suggestedReps: nextReps,
        confidence,
        reason: `Evoluindo! Tente ${nextReps} reps.`,
      }
    }
    return {
      type: 'maintain',
      suggestedReps: allReps[0],
      confidence,
      reason: `Continue consolidando ${allReps[0]} reps antes de aumentar.`,
    }
  }

  // Weighted exercises — check regression first (most important)
  const isRegressing = detectRegression(weights, config.regressionThreshold)
  if (isRegressing) {
    const regressionDrop = weights[config.regressionThreshold - 1] - weights[0]
    if (Math.abs(regressionDrop) >= lastWeight * 0.1) {
      // Significant drop (>10%): suggest deload
      const deloadWeight = roundToIncrement(lastWeight * 0.9, weightIncrement(lastWeight))
      return {
        type: 'deload',
        suggestedWeight: deloadWeight,
        suggestedReps: config.targetRepsMin,
        confidence,
        reason: `Queda recente de desempenho. Faça um deload leve com ${deloadWeight}kg e foque na técnica.`,
      }
    }
    return {
      type: 'maintain',
      suggestedWeight: lastWeight,
      suggestedReps: lastReps,
      confidence,
      reason: 'Queda recente de desempenho. Mantenha a carga e priorize a execução.',
    }
  }

  // Check stagnation
  const isStagnant = detectStagnation(weights, config.stagnationThreshold)
  if (isStagnant) {
    // Stagnant but consistently hitting target reps: push weight increase
    const allHitTarget = history
      .slice(0, config.stagnationThreshold)
      .every((r) => allSetsHitTarget(r.sets, config.targetRepsMin))
    if (allHitTarget) {
      const suggested = suggestWeightIncrease(lastWeight)
      return {
        type: 'increase_weight',
        suggestedWeight: suggested,
        suggestedReps: config.targetRepsMin,
        confidence,
        reason: `Estagnado em ${lastWeight}kg mas atingindo as reps. Chegou a hora de aumentar para ${suggested}kg.`,
      }
    }
    return {
      type: 'maintain',
      suggestedWeight: lastWeight,
      suggestedReps: config.targetRepsMin,
      confidence,
      reason: `Estagnado em ${lastWeight}kg. Foque em completar todas as séries com ${config.targetRepsMin}+ reps antes de aumentar.`,
    }
  }

  // Normal progression path
  if (allSetsHitTarget(lastSets, config.targetRepsMin)) {
    const suggested = suggestWeightIncrease(lastWeight)
    return {
      type: 'increase_weight',
      suggestedWeight: suggested,
      suggestedReps: config.targetRepsMin,
      confidence,
      reason: `Última sessão: ${lastWeight}kg × ${lastReps} reps ✓ Tente ${suggested}kg na próxima.`,
    }
  }

  const nextReps = Math.min(lastReps + 1, config.targetRepsMax)
  return {
    type: 'increase_reps',
    suggestedWeight: lastWeight,
    suggestedReps: nextReps,
    confidence,
    reason: `Mantenha ${lastWeight}kg e tente chegar em ${nextReps} reps.`,
  }
}

// ─── Exercise status ──────────────────────────────────────────────────────────

export function getExerciseStatus(
  exerciseId: string,
  config: ProgressionConfig = DEFAULT_CONFIG
): ExerciseStatus {
  const history = getExerciseHistory(exerciseId)
  if (history.length < 2) return 'insufficient_data'

  const weights = history.map((r) => bestWeightInSession(r.sets))

  if (detectRegression(weights, config.regressionThreshold)) return 'regressing'
  if (detectStagnation(weights, config.stagnationThreshold)) return 'stagnant'
  if (detectImprovement(weights, 2)) return 'improving'
  return 'stable'
}

// ─── All exercises intelligence ───────────────────────────────────────────────

export function getAllExerciseIntelligence(
  config: ProgressionConfig = DEFAULT_CONFIG
): ExerciseIntelligence[] {
  const history = getWorkoutHistory()
  const seen = new Set<string>()
  const exerciseNames = new Map<string, string>()
  const lastDateByExercise = new Map<string, string>()

  for (const workout of history) {
    for (const ex of workout.exercises) {
      exerciseNames.set(ex.exerciseId, ex.exerciseName)
      if (!lastDateByExercise.has(ex.exerciseId)) {
        lastDateByExercise.set(ex.exerciseId, workout.completedAt)
      }
      seen.add(ex.exerciseId)
    }
  }

  const now = new Date().toISOString()
  return Array.from(seen).map((exerciseId) => {
    const name = exerciseNames.get(exerciseId) ?? exerciseId
    const lastDate = lastDateByExercise.get(exerciseId) ?? null
    const exHistory = getExerciseHistory(exerciseId)
    return {
      exerciseId,
      exerciseName: name,
      status: getExerciseStatus(exerciseId, config),
      recommendation: generateRecommendation(exerciseId, config),
      sessionsAnalyzed: exHistory.length,
      daysSinceLastSession: lastDate ? daysBetween(now, lastDate) : null,
    }
  })
}

// ─── Top challenges for Dashboard ─────────────────────────────────────────────

export function getTopChallenges(limit = 5): ExerciseIntelligence[] {
  const all = getAllExerciseIntelligence()

  const statusPriority: Record<ExerciseStatus, number> = {
    improving: 0,
    stable: 1,
    stagnant: 2,
    regressing: 3,
    insufficient_data: 4,
  }

  return all
    .filter(
      (e) =>
        e.recommendation.type !== 'insufficient_data' &&
        e.recommendation.suggestedWeight !== undefined
    )
    .sort((a, b) => statusPriority[a.status] - statusPriority[b.status])
    .slice(0, limit)
}

// ─── Weekly comparison ────────────────────────────────────────────────────────

export interface WeeklyIntelligenceSummary {
  currentWeekPrs: number
  previousWeekPrs: number
  currentWeekVolume: number
  previousWeekVolume: number
  improvingCount: number
  stagnantCount: number
  regressingCount: number
}

function isoWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeeklyIntelligenceSummary(): WeeklyIntelligenceSummary {
  const history = getWorkoutHistory()
  const now = new Date()
  const thisWeekStart = isoWeekStart(now)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  let currentWeekPrs = 0
  let previousWeekPrs = 0
  let currentWeekVolume = 0
  let previousWeekVolume = 0

  for (const workout of history) {
    const date = new Date(workout.completedAt)
    const isCurrentWeek = date >= thisWeekStart
    const isLastWeek = date >= lastWeekStart && date < thisWeekStart
    const volume = workout.exercises.reduce(
      (sum, ex) => sum + calculateVolumeKg(ex.sets),
      0
    )
    if (isCurrentWeek) {
      currentWeekPrs += workout.prsCount
      currentWeekVolume += volume
    } else if (isLastWeek) {
      previousWeekPrs += workout.prsCount
      previousWeekVolume += volume
    }
  }

  const all = getAllExerciseIntelligence()
  const improvingCount = all.filter((e) => e.status === 'improving').length
  const stagnantCount = all.filter((e) => e.status === 'stagnant').length
  const regressingCount = all.filter((e) => e.status === 'regressing').length

  return {
    currentWeekPrs,
    previousWeekPrs,
    currentWeekVolume: Math.round(currentWeekVolume),
    previousWeekVolume: Math.round(previousWeekVolume),
    improvingCount,
    stagnantCount,
    regressingCount,
  }
}
