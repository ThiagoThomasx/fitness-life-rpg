// Comparação planejado × realizado — Sprint 20 Parte 3A.
//
// Motor puro: recebe dados já resolvidos, nunca acessa storage. Nunca afirma
// que um exercício "substituiu" outro sem vínculo explícito — só relata
// "planejado não realizado" / "adicionado durante a execução". Diferenças só
// são calculadas quando ambos os lados existem; dado ausente nunca vira zero.

import type { ResolvedProgramExercise } from './training-blocks'
import { calculatePlannedVolume } from './training-blocks'
import { calculateVolumeKg } from './exercise-records'
import type { ExerciseRecord, CompletedWorkout } from './workout-history'
import type { PlannedWorkout } from './planned-workouts'
import { classifySessionAttendance, type ProgramAdherenceConfig, DEFAULT_PROGRAM_ADHERENCE_CONFIG } from './program-adherence'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlannedExerciseMetrics {
  sets?: number
  reps?: string
  loadKg?: number
  durationSeconds?: number
  distanceMeters?: number
  restSeconds?: number
  rir?: number
  rpe?: number
}

export interface PerformedExerciseMetrics {
  sets?: number
  completedSets?: number
  repetitions?: number[]
  averageReps?: number
  averageLoadKg?: number
  maximumLoadKg?: number
  durationSeconds?: number
  distanceMeters?: number
  averageRir?: number
  averageRpe?: number
  volume?: number
}

export interface ExerciseMetricDifferences {
  setsDifference?: number
  repsComparable: boolean
  repsDifference?: number
  loadDifferenceKg?: number
  volumeDifferenceKg?: number
  durationDifferenceSeconds?: number
  rirDifference?: number
  rpeDifference?: number
}

export type ExerciseMatchStatus = 'matched' | 'planned_only' | 'performed_only' | 'ambiguous'

export interface ExercisePlannedPerformedComparison {
  plannedExerciseId?: string
  performedExerciseId?: string
  exerciseName: string
  matchStatus: ExerciseMatchStatus
  planned?: PlannedExerciseMetrics
  performed?: PerformedExerciseMetrics
  differences?: ExerciseMetricDifferences
}

export interface SessionPlannedPerformedSummary {
  plannedExerciseCount: number
  performedExerciseCount: number
  matchedExerciseCount: number
  skippedExerciseCount: number
  addedExerciseCount: number
  plannedDurationMinutes?: number
  performedDurationMinutes?: number
  plannedVolume?: number
  performedVolume?: number
}

export type PlannedPerformedSessionStatus =
  | 'completed'
  | 'partially_completed'
  | 'skipped'
  | 'cancelled'
  | 'not_due'
  | 'overdue'

export interface PlannedPerformedComparison {
  plannedWorkoutId: string
  completedWorkoutId?: string
  status: PlannedPerformedSessionStatus
  sessionSummary: SessionPlannedPerformedSummary
  exerciseComparisons: ExercisePlannedPerformedComparison[]
  dataStatus: 'available' | 'partial' | 'insufficient_data'
}

// ─── Name normalization ────────────────────────────────────────────────────────

/** Lowercase, sem acento/pontuação — usado só como fallback de matching (Fase 23), nunca fuzzy. */
export function normalizeExerciseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

// ─── Metrics extraction ─────────────────────────────────────────────────────────

function toPlannedMetrics(ex: ResolvedProgramExercise): PlannedExerciseMetrics {
  return {
    sets: ex.sets,
    reps: ex.reps,
    loadKg: ex.loadKg,
    durationSeconds: ex.durationSeconds,
    distanceMeters: ex.distanceMeters,
    restSeconds: ex.restSeconds,
    rir: ex.rir,
    rpe: ex.rpe,
  }
}

function toPerformedMetrics(record: ExerciseRecord): PerformedExerciseMetrics {
  const repetitions = record.sets.map((s) => s.reps)
  const loads = record.sets.map((s) => s.weight_kg)
  const averageReps = repetitions.length > 0 ? repetitions.reduce((a, b) => a + b, 0) / repetitions.length : undefined
  const averageLoadKg = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : undefined
  const maximumLoadKg = loads.length > 0 ? Math.max(...loads) : undefined

  return {
    sets: record.sets.length,
    completedSets: record.sets.length,
    repetitions,
    averageReps,
    averageLoadKg,
    maximumLoadKg,
    // Duração, distância, RIR e RPE não são capturados por sessão/exercício hoje
    // (auditoria Sprint 20 Parte 3) — nunca inventados, ficam undefined.
    durationSeconds: undefined,
    distanceMeters: undefined,
    averageRir: undefined,
    averageRpe: undefined,
    volume: calculateVolumeKg(record.sets),
  }
}

// ─── Differences ────────────────────────────────────────────────────────────────

function plannedSingleExerciseVolume(ex: ResolvedProgramExercise): number | undefined {
  const result = calculatePlannedVolume([ex])
  return result.calculableExerciseCount > 0 ? result.totalVolumeKg : undefined
}

function buildDifferences(
  plannedResolved: ResolvedProgramExercise | undefined,
  planned: PlannedExerciseMetrics | undefined,
  performed: PerformedExerciseMetrics | undefined
): ExerciseMetricDifferences | undefined {
  if (!planned || !performed) return undefined

  const setsDifference =
    planned.sets !== undefined && performed.completedSets !== undefined
      ? performed.completedSets - planned.sets
      : undefined

  const repsIsNumeric = planned.reps !== undefined && /^\d+$/.test(planned.reps.trim())
  const repsDifference =
    repsIsNumeric && performed.averageReps !== undefined ? performed.averageReps - Number(planned.reps) : undefined

  const loadDifferenceKg =
    planned.loadKg !== undefined && performed.averageLoadKg !== undefined
      ? performed.averageLoadKg - planned.loadKg
      : undefined

  const plannedVolume = plannedResolved ? plannedSingleExerciseVolume(plannedResolved) : undefined
  const volumeDifferenceKg =
    plannedVolume !== undefined && performed.volume !== undefined ? performed.volume - plannedVolume : undefined

  const durationDifferenceSeconds =
    planned.durationSeconds !== undefined && performed.durationSeconds !== undefined
      ? performed.durationSeconds - planned.durationSeconds
      : undefined

  const rirDifference =
    planned.rir !== undefined && performed.averageRir !== undefined ? performed.averageRir - planned.rir : undefined
  const rpeDifference =
    planned.rpe !== undefined && performed.averageRpe !== undefined ? performed.averageRpe - planned.rpe : undefined

  return {
    setsDifference,
    repsComparable: repsIsNumeric,
    repsDifference,
    loadDifferenceKg,
    volumeDifferenceKg,
    durationDifferenceSeconds,
    rirDifference,
    rpeDifference,
  }
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function buildComparison(
  plannedEx: ResolvedProgramExercise | undefined,
  performedEx: ExerciseRecord | undefined,
  matchStatus: ExerciseMatchStatus
): ExercisePlannedPerformedComparison {
  const planned = plannedEx ? toPlannedMetrics(plannedEx) : undefined
  const performed = performedEx ? toPerformedMetrics(performedEx) : undefined

  return {
    plannedExerciseId: plannedEx?.exerciseId,
    performedExerciseId: performedEx?.exerciseId,
    exerciseName: plannedEx?.exerciseName ?? performedEx?.exerciseName ?? '',
    matchStatus,
    planned,
    performed,
    differences: matchStatus === 'matched' ? buildDifferences(plannedEx, planned, performed) : undefined,
  }
}

/**
 * Ordem de matching: exerciseId igual → nome normalizado igual → posição
 * (só quando as contagens remanescentes batem 1:1, Fase 22-23). Nunca casa
 * dois exercícios ambíguos automaticamente.
 */
export function matchPlannedToPerformedExercises(
  planned: ResolvedProgramExercise[],
  performed: ExerciseRecord[]
): ExercisePlannedPerformedComparison[] {
  const claimedPlanned = new Set<number>()
  const claimedPerformed = new Set<number>()
  const comparisons: ExercisePlannedPerformedComparison[] = []

  function candidatesFor(predicate: (perf: ExerciseRecord) => boolean): number[] {
    const result: number[] = []
    performed.forEach((perf, idx) => {
      if (!claimedPerformed.has(idx) && predicate(perf)) result.push(idx)
    })
    return result
  }

  // Tier 1: exerciseId
  for (let i = 0; i < planned.length; i++) {
    if (claimedPlanned.has(i)) continue
    const p = planned[i]
    if (!p.exerciseId) continue
    const candidates = candidatesFor((perf) => perf.exerciseId === p.exerciseId)
    if (candidates.length === 1) {
      claimedPlanned.add(i)
      claimedPerformed.add(candidates[0])
      comparisons.push(buildComparison(p, performed[candidates[0]], 'matched'))
    }
  }

  // Tier 2: normalized name
  for (let i = 0; i < planned.length; i++) {
    if (claimedPlanned.has(i)) continue
    const p = planned[i]
    const normName = normalizeExerciseName(p.exerciseName)
    const candidates = candidatesFor((perf) => normalizeExerciseName(perf.exerciseName) === normName)
    if (candidates.length === 1) {
      claimedPlanned.add(i)
      claimedPerformed.add(candidates[0])
      comparisons.push(buildComparison(p, performed[candidates[0]], 'matched'))
    } else if (candidates.length > 1) {
      claimedPlanned.add(i)
      comparisons.push(buildComparison(p, undefined, 'ambiguous'))
    }
  }

  // Tier 3: position fallback, só quando os remanescentes batem 1:1
  const remainingPlanned = planned.map((_, i) => i).filter((i) => !claimedPlanned.has(i))
  const remainingPerformed = performed.map((_, i) => i).filter((i) => !claimedPerformed.has(i))

  if (remainingPlanned.length > 0 && remainingPlanned.length === remainingPerformed.length) {
    for (let k = 0; k < remainingPlanned.length; k++) {
      const pi = remainingPlanned[k]
      const fi = remainingPerformed[k]
      claimedPlanned.add(pi)
      claimedPerformed.add(fi)
      comparisons.push(buildComparison(planned[pi], performed[fi], 'matched'))
    }
  } else {
    for (const pi of remainingPlanned) {
      claimedPlanned.add(pi)
      comparisons.push(buildComparison(planned[pi], undefined, 'planned_only'))
    }
  }

  performed.forEach((perf, idx) => {
    if (!claimedPerformed.has(idx)) comparisons.push(buildComparison(undefined, perf, 'performed_only'))
  })

  return comparisons
}

// ─── Session summary ────────────────────────────────────────────────────────────

export function buildSessionPlannedPerformedSummary(
  resolvedExercises: ResolvedProgramExercise[],
  performedExercises: ExerciseRecord[],
  comparisons: ExercisePlannedPerformedComparison[],
  plannedDurationMinutes?: number,
  performedDurationMinutes?: number
): SessionPlannedPerformedSummary {
  const matchedExerciseCount = comparisons.filter((c) => c.matchStatus === 'matched').length
  const skippedExerciseCount = comparisons.filter((c) => c.matchStatus === 'planned_only').length
  const addedExerciseCount = comparisons.filter((c) => c.matchStatus === 'performed_only').length

  const plannedVolumeResult = calculatePlannedVolume(resolvedExercises)
  const plannedVolume = plannedVolumeResult.calculableExerciseCount > 0 ? plannedVolumeResult.totalVolumeKg : undefined
  const performedVolume =
    performedExercises.length > 0
      ? performedExercises.reduce((sum, ex) => sum + calculateVolumeKg(ex.sets), 0)
      : undefined

  return {
    plannedExerciseCount: resolvedExercises.length,
    performedExerciseCount: performedExercises.length,
    matchedExerciseCount,
    skippedExerciseCount,
    addedExerciseCount,
    plannedDurationMinutes,
    performedDurationMinutes,
    plannedVolume,
    performedVolume,
  }
}

// ─── Planner adapter (Sprint 21 — Parte 2) ─────────────────────────────────────

/**
 * Constrói `ResolvedProgramExercise[]` direto do snapshot congelado do
 * `PlannedWorkout`, sem voltar a resolver contra o programa/bloco ao vivo.
 * `PlannedWorkout.templateSnapshot` já é o resultado final (template +
 * overrides de semana) capturado na instanciação — reabrir essa resolução
 * aqui duplicaria lógica de `resolveProgramSessionForWeek` e poderia divergir
 * se o programa mudou depois que a sessão foi planejada.
 */
export function resolvedExercisesFromPlannedWorkout(planned: PlannedWorkout): ResolvedProgramExercise[] {
  return planned.templateSnapshot.exerciseBlocks.map((block) => ({
    exerciseId: block.exercise.exerciseId,
    exerciseName: block.exercise.exerciseName,
    sets: block.exercise.sets,
    reps: block.exercise.reps,
    loadKg: block.exercise.loadKg,
    durationSeconds: block.exercise.durationSeconds,
    distanceMeters: block.exercise.distanceMeters,
    restSeconds: block.exercise.restSeconds,
    rir: block.exercise.rir,
    rpe: block.exercise.rpe,
    tempo: block.exercise.tempo,
    notes: block.exercise.notes,
    source: 'template',
  }))
}

// ─── Top-level assembler ───────────────────────────────────────────────────────

function toComparisonStatus(
  attendance: ReturnType<typeof classifySessionAttendance>
): PlannedPerformedSessionStatus {
  if (attendance === 'partial') return 'partially_completed'
  if (attendance === 'pending') return 'not_due'
  return attendance
}

export function buildPlannedPerformedComparison(
  plannedWorkout: PlannedWorkout,
  resolvedExercises: ResolvedProgramExercise[],
  completedWorkout: CompletedWorkout | undefined,
  today: string,
  config: ProgramAdherenceConfig = DEFAULT_PROGRAM_ADHERENCE_CONFIG
): PlannedPerformedComparison {
  const attendance = classifySessionAttendance(plannedWorkout, completedWorkout, today, config)
  const status = toComparisonStatus(attendance)

  const performedExercises = completedWorkout?.exercises ?? []
  const exerciseComparisons = matchPlannedToPerformedExercises(resolvedExercises, performedExercises)

  const plannedDurationMinutes = plannedWorkout.templateSnapshot.estimatedDurationMinutes
  const performedDurationMinutes = completedWorkout ? completedWorkout.durationSeconds / 60 : undefined

  const sessionSummary = buildSessionPlannedPerformedSummary(
    resolvedExercises,
    performedExercises,
    exerciseComparisons,
    plannedDurationMinutes,
    performedDurationMinutes
  )

  let dataStatus: PlannedPerformedComparison['dataStatus']
  if (!completedWorkout) {
    dataStatus = 'insufficient_data'
  } else if (exerciseComparisons.some((c) => c.matchStatus === 'ambiguous')) {
    dataStatus = 'partial'
  } else {
    dataStatus = 'available'
  }

  return {
    plannedWorkoutId: plannedWorkout.id,
    completedWorkoutId: completedWorkout?.id,
    status,
    sessionSummary,
    exerciseComparisons,
    dataStatus,
  }
}
