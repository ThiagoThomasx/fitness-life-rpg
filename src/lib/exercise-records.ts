import { getWorkoutHistory, getExerciseHistory, type SetRecord } from './workout-history'

export interface SetInput {
  weight_kg: number
  reps: number
}

// ─── Matemática básica ────────────────────────────────────────────────────────

export function calculateVolumeKg(sets: SetInput[]): number {
  return sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)
}

export function calculateEstimated1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  return weightKg * (1 + reps / 30)
}

function maxOrZero(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values)
}

function bestEstimated1RM(sets: SetInput[]): number | null {
  const withLoad = sets.filter((s) => s.weight_kg > 0)
  if (withLoad.length === 0) return null
  return maxOrZero(withLoad.map((s) => calculateEstimated1RM(s.weight_kg, s.reps)))
}

// ─── Detecção de recordes por sessão ──────────────────────────────────────────

export interface ExercisePrDetection {
  isWeightPr: boolean
  isRepsPr: boolean
  isVolumePr: boolean
  isFirstTime: boolean
  maxWeightKg: number
  maxReps: number
  volumeKg: number
  estimated1RMKg: number | null
}

/**
 * Compara as séries desta sessão com o histórico PRÉVIO do exercício
 * (getExerciseHistory já reflete apenas sessões já salvas — deve ser chamado
 * antes de saveCompletedWorkout para a sessão atual não se comparar consigo mesma).
 * Empates não contam como recorde (`>`, não `>=`), espelhando o detector estreito
 * já existente em sessao/page.tsx.
 */
export function detectExercisePrs(exerciseId: string, sets: SetInput[]): ExercisePrDetection {
  const priorRecords = getExerciseHistory(exerciseId)
  const hasPriorHistory = priorRecords.length > 0

  const bestPriorWeightKg = maxOrZero(priorRecords.flatMap((r) => r.sets.map((s) => s.weight_kg)))
  const bestPriorReps = maxOrZero(priorRecords.flatMap((r) => r.sets.map((s) => s.reps)))
  const bestPriorVolumeKg = maxOrZero(priorRecords.map((r) => calculateVolumeKg(r.sets)))

  const maxWeightKg = maxOrZero(sets.map((s) => s.weight_kg))
  const maxReps = maxOrZero(sets.map((s) => s.reps))
  const volumeKg = calculateVolumeKg(sets)

  return {
    isWeightPr: hasPriorHistory && maxWeightKg > bestPriorWeightKg,
    isRepsPr: hasPriorHistory && maxReps > bestPriorReps,
    isVolumePr: hasPriorHistory && volumeKg > bestPriorVolumeKg,
    isFirstTime: !hasPriorHistory,
    maxWeightKg,
    maxReps,
    volumeKg,
    estimated1RMKg: bestEstimated1RM(sets),
  }
}

// ─── Resumo por exercício ──────────────────────────────────────────────────────

export interface ExerciseSummary {
  exerciseId: string
  exerciseName: string
  bestWeightKg: number
  bestReps: number
  bestVolumeKg: number
  bestEstimated1RMKg: number | null
  lastPerformedAt: string | null
  lastSets: SetRecord[]
  trend: 'up' | 'down' | 'flat' | 'insufficient_data'
}

export function getExerciseSummary(exerciseId: string): ExerciseSummary | null {
  const records = getExerciseHistory(exerciseId)
  if (records.length === 0) return null

  const history = getWorkoutHistory()
  const exerciseName = records[0].exerciseName

  const bestWeightKg = maxOrZero(records.flatMap((r) => r.sets.map((s) => s.weight_kg)))
  const bestReps = maxOrZero(records.flatMap((r) => r.sets.map((s) => s.reps)))
  const bestVolumeKg = maxOrZero(records.map((r) => calculateVolumeKg(r.sets)))
  const best1RMs = records.map((r) => bestEstimated1RM(r.sets)).filter((v): v is number => v !== null)
  const bestEstimated1RMKg = best1RMs.length > 0 ? maxOrZero(best1RMs) : null

  // getExerciseHistory preserva a ordem (mais recente primeiro) de getWorkoutHistory.
  const lastPerformedAt =
    history.find((w) => w.exercises.some((e) => e.exerciseId === exerciseId))?.completedAt ?? null
  const lastSets = records[0].sets

  let trend: ExerciseSummary['trend'] = 'insufficient_data'
  if (records.length >= 2) {
    const latestMax = maxOrZero(records[0].sets.map((s) => s.weight_kg))
    const previousMax = maxOrZero(records[1].sets.map((s) => s.weight_kg))
    trend = latestMax > previousMax ? 'up' : latestMax < previousMax ? 'down' : 'flat'
  }

  return {
    exerciseId,
    exerciseName,
    bestWeightKg,
    bestReps,
    bestVolumeKg,
    bestEstimated1RMKg,
    lastPerformedAt,
    lastSets,
    trend,
  }
}

export interface LastExecutionSummary {
  weightKg: number
  reps: number
  date: string
}

export function getLastExecutionSummary(exerciseId: string): LastExecutionSummary | null {
  const records = getExerciseHistory(exerciseId)
  if (records.length === 0) return null

  const history = getWorkoutHistory()
  const date = history.find((w) => w.exercises.some((e) => e.exerciseId === exerciseId))?.completedAt ?? null
  if (!date) return null

  const lastSets = records[0].sets
  if (lastSets.length === 0) return null

  const bestSet = lastSets.reduce((best, s) => {
    if (s.weight_kg > best.weight_kg) return s
    if (s.weight_kg === best.weight_kg && s.reps > best.reps) return s
    return best
  }, lastSets[0])

  return { weightKg: bestSet.weight_kg, reps: bestSet.reps, date }
}

// ─── Agregados entre exercícios ────────────────────────────────────────────────

export type RecordType = 'first_time' | 'weight' | 'volume' | 'reps'

export interface RecentRecordEntry {
  exerciseId: string
  exerciseName: string
  date: string
  type: RecordType
}

export function getRecentRecords(limit = 5): RecentRecordEntry[] {
  const history = getWorkoutHistory()
  const entries: RecentRecordEntry[] = []

  for (const w of history) {
    for (const ex of w.exercises) {
      if (entries.length >= limit) break
      let type: RecordType | null = null
      if (ex.isFirstTime) type = 'first_time'
      else if (ex.isWeightPr) type = 'weight'
      else if (ex.isVolumePr) type = 'volume'
      else if (ex.isRepsPr) type = 'reps'

      if (type) {
        entries.push({ exerciseId: ex.exerciseId, exerciseName: ex.exerciseName, date: w.completedAt, type })
      }
    }
    if (entries.length >= limit) break
  }

  return entries.slice(0, limit)
}

export interface ExerciseGrowthEntry {
  exerciseId: string
  exerciseName: string
  earliestWeightKg: number
  latestWeightKg: number
  deltaKg: number
  deltaPercent: number
}

function buildGrowthEntries(minSessions: number): ExerciseGrowthEntry[] {
  const history = getWorkoutHistory() // mais recente primeiro
  const byExercise = new Map<string, { name: string; sessions: SetRecord[][] }>()

  // Percorre do mais antigo para o mais recente para popular sessions em ordem cronológica.
  for (const w of [...history].reverse()) {
    for (const ex of w.exercises) {
      if (ex.sets.length === 0) continue
      const entry = byExercise.get(ex.exerciseId) ?? { name: ex.exerciseName, sessions: [] }
      entry.sessions.push(ex.sets)
      byExercise.set(ex.exerciseId, entry)
    }
  }

  const growth: ExerciseGrowthEntry[] = []
  for (const [exerciseId, { name, sessions }] of Array.from(byExercise.entries())) {
    if (sessions.length < minSessions) continue
    const earliestWeightKg = maxOrZero(sessions[0].map((s) => s.weight_kg))
    const latestWeightKg = maxOrZero(sessions[sessions.length - 1].map((s) => s.weight_kg))
    const deltaKg = latestWeightKg - earliestWeightKg
    const deltaPercent = earliestWeightKg > 0 ? (deltaKg / earliestWeightKg) * 100 : 0
    growth.push({ exerciseId, exerciseName: name, earliestWeightKg, latestWeightKg, deltaKg, deltaPercent })
  }

  return growth
}

export function getTopGrowthExercises(limit = 3): ExerciseGrowthEntry[] {
  return buildGrowthEntries(2)
    .filter((g) => g.deltaKg > 0)
    .sort((a, b) => b.deltaKg - a.deltaKg)
    .slice(0, limit)
}

export function getStagnantExercises(minSessions = 3, limit = 3): ExerciseGrowthEntry[] {
  return buildGrowthEntries(minSessions)
    .filter((g) => g.deltaKg <= 0)
    .sort((a, b) => a.deltaKg - b.deltaKg)
    .slice(0, limit)
}

export interface ProfileRecordStats {
  totalRecords: number
  heaviestWeightEverKg: number
  heaviestWeightExerciseName: string | null
  mostImprovedExercise: ExerciseGrowthEntry | null
  longestImprovementStreak: number
}

export function getProfileRecordStats(): ProfileRecordStats {
  const history = getWorkoutHistory()

  let totalRecords = 0
  let heaviestWeightEverKg = 0
  let heaviestWeightExerciseName: string | null = null

  for (const w of history) {
    for (const ex of w.exercises) {
      if (ex.isWeightPr || ex.isRepsPr || ex.isVolumePr || ex.isFirstTime) totalRecords++
      for (const set of ex.sets) {
        if (set.weight_kg > heaviestWeightEverKg) {
          heaviestWeightEverKg = set.weight_kg
          heaviestWeightExerciseName = ex.exerciseName
        }
      }
    }
  }

  const mostImprovedExercise = getTopGrowthExercises(1)[0] ?? null

  // Percorre do mais antigo para o mais recente para computar a maior sequência.
  let currentStreak = 0
  let longestImprovementStreak = 0
  for (const w of [...history].reverse()) {
    const qualifies = w.exercises.some((ex) => ex.isWeightPr || ex.isRepsPr || ex.isVolumePr || ex.isFirstTime)
    currentStreak = qualifies ? currentStreak + 1 : 0
    if (currentStreak > longestImprovementStreak) longestImprovementStreak = currentStreak
  }

  return {
    totalRecords,
    heaviestWeightEverKg,
    heaviestWeightExerciseName,
    mostImprovedExercise,
    longestImprovementStreak,
  }
}
