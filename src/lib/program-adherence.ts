// Aderência de programa — Sprint 20 Parte 3A.
//
// Motor puro: nunca acessa storage, nunca julga o usuário, nunca prescreve.
// Aderência é sobre presença (a sessão aconteceu?), não sobre performance
// (carga/volume/recordes) — essa distinção é intencional (ver PROGRAM-ADHERENCE.md).
// "Sessão pulada" != "sessão cancelada": pulada ainda fazia parte do plano,
// cancelada deixou de fazer parte dele. Sessões opcionais e canceladas nunca
// reduzem a taxa de aderência por padrão; sessões extras nunca elevam a taxa
// acima de 100%.

import type { PlannedWorkout } from './planned-workouts'
import type { CompletedWorkout } from './workout-history'
import type { TrainingBlock } from './training-blocks'
import type { TrainingProgram } from './training-programs'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface ProgramAdherenceConfig {
  optionalSessionsAffectRate: boolean
  cancelledSessionsAffectRate: boolean
  partialSessionWeight?: number
  overdueGraceDays: number
}

export const DEFAULT_PROGRAM_ADHERENCE_CONFIG: ProgramAdherenceConfig = {
  optionalSessionsAffectRate: false,
  cancelledSessionsAffectRate: false,
  overdueGraceDays: 1,
}

/** Abaixo deste percentual de exercícios executados, uma sessão concluída é "parcial", não "completa". */
const PARTIAL_EXECUTION_THRESHOLD = 0.7

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionAttendanceStatus = 'completed' | 'partial' | 'skipped' | 'cancelled' | 'pending' | 'overdue'

export interface SessionAdherence {
  plannedWorkoutId: string
  attendanceStatus: SessionAttendanceStatus
  executionRate?: number
  exerciseMatchRate?: number
  dataStatus: 'available' | 'partial' | 'not_applicable'
}

export interface ProgramWeekAdherence {
  weekId: string
  weekNumber: number
  plannedSessions: number
  completedSessions: number
  partialSessions: number
  skippedSessions: number
  cancelledSessions: number
  pendingSessions: number
  extraSessions: number
  adherenceRate?: number
  dataStatus: 'complete' | 'in_progress' | 'future' | 'insufficient_data'
}

export interface TrainingBlockAdherence {
  blockId: string
  blockName: string
  plannedSessions: number
  completedSessions: number
  skippedSessions: number
  adherenceRate?: number
  completedWeeks: number
  totalWeeks: number
  status: 'future' | 'in_progress' | 'completed'
}

export interface TrainingProgramAdherence {
  programId: string
  programVersion: number
  plannedSessions: number
  completedSessions: number
  partialSessions: number
  skippedSessions: number
  cancelledSessions: number
  extraSessions: number
  adherenceRate?: number
  weekSummaries: ProgramWeekAdherence[]
  blockSummaries: TrainingBlockAdherence[]
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'
}

export interface ProgramExecutionIntegrityReport {
  plannedWithoutCompletedRecord: string[]
  completedWithoutPlannedRecord: string[]
  duplicateLinks: string[]
  invalidReschedules: string[]
  reviewsWithoutProgram: string[]
}

// ─── Session attendance ─────────────────────────────────────────────────────────

function isOverdue(date: string, today: string, graceDays: number): boolean {
  const graceDate = new Date(today + 'T00:00:00')
  graceDate.setDate(graceDate.getDate() - graceDays)
  const graceCutoff = graceDate.toISOString().slice(0, 10)
  return date < graceCutoff
}

/** Deriva o estado de comparecimento a partir de `status` + data — nunca reclassifica automaticamente para "pulada". */
export function classifySessionAttendance(
  planned: PlannedWorkout,
  completed: CompletedWorkout | undefined,
  today: string,
  config: ProgramAdherenceConfig = DEFAULT_PROGRAM_ADHERENCE_CONFIG
): SessionAttendanceStatus {
  if (planned.status === 'cancelled') return 'cancelled'
  if (planned.status === 'skipped') return 'skipped'

  if (planned.status === 'done') {
    const plannedExerciseCount = planned.templateSnapshot.exerciseBlocks.length
    const performedExerciseCount = completed?.exercises.length ?? 0
    if (plannedExerciseCount > 0 && completed) {
      const rate = performedExerciseCount / plannedExerciseCount
      if (rate < PARTIAL_EXECUTION_THRESHOLD) return 'partial'
    }
    return 'completed'
  }

  // status === 'pending'
  return isOverdue(planned.date, today, config.overdueGraceDays) ? 'overdue' : 'pending'
}

export function computeSessionAdherence(
  plannedWorkouts: PlannedWorkout[],
  completedById: Map<string, CompletedWorkout>,
  today: string,
  config: ProgramAdherenceConfig = DEFAULT_PROGRAM_ADHERENCE_CONFIG
): SessionAdherence[] {
  return plannedWorkouts.map((planned) => {
    const completedWorkoutId = planned.execution?.completedWorkoutId
    const completed = completedWorkoutId ? completedById.get(completedWorkoutId) : undefined
    const attendanceStatus = classifySessionAttendance(planned, completed, today, config)

    const plannedExerciseCount = planned.templateSnapshot.exerciseBlocks.length
    const exerciseMatchRate =
      completed && plannedExerciseCount > 0
        ? Math.min(1, completed.exercises.length / plannedExerciseCount)
        : undefined

    let dataStatus: SessionAdherence['dataStatus'] = 'not_applicable'
    if (attendanceStatus === 'completed' || attendanceStatus === 'partial') {
      dataStatus = completed ? 'available' : 'partial'
    }

    return {
      plannedWorkoutId: planned.id,
      attendanceStatus,
      executionRate: exerciseMatchRate,
      exerciseMatchRate,
      dataStatus,
    }
  })
}

// ─── Rate calculation (shared by week/block/program) ───────────────────────────

function attendedWeight(status: SessionAttendanceStatus, config: ProgramAdherenceConfig): number {
  if (status === 'completed') return 1
  if (status === 'partial') return config.partialSessionWeight ?? 1
  return 0
}

/**
 * Sessões opcionais e canceladas (conforme config) nunca entram no denominador —
 * não reduzem a taxa. Sessões extras nunca entram no cálculo (Fase 38).
 */
function computeRate(
  planned: PlannedWorkout[],
  attendance: Map<string, SessionAttendanceStatus>,
  config: ProgramAdherenceConfig
): number | undefined {
  // Opcionais e canceladas (conforme config) ficam fora do denominador — realizadas
  // ou não, aparecem só como contexto (Fase 37/38), nunca alteram a taxa.
  const applicable = planned.filter((p) => {
    if (p.isOptional && !config.optionalSessionsAffectRate) return false
    if (p.status === 'cancelled' && !config.cancelledSessionsAffectRate) return false
    return true
  })

  if (applicable.length === 0) return undefined

  const attended = applicable.reduce((sum, p) => sum + attendedWeight(attendance.get(p.id) ?? 'pending', config), 0)
  return Math.min(1, attended / applicable.length)
}

// ─── Week adherence ───────────────────────────────────────────────────────────

export function computeWeekAdherence(
  weekPlannedWorkouts: PlannedWorkout[],
  weekId: string,
  weekNumber: number,
  completedById: Map<string, CompletedWorkout>,
  extraSessionsInWeek: CompletedWorkout[],
  today: string,
  config: ProgramAdherenceConfig = DEFAULT_PROGRAM_ADHERENCE_CONFIG
): ProgramWeekAdherence {
  const sessionAdherence = computeSessionAdherence(weekPlannedWorkouts, completedById, today, config)
  const attendanceById = new Map(sessionAdherence.map((s) => [s.plannedWorkoutId, s.attendanceStatus]))

  const completedSessions = sessionAdherence.filter((s) => s.attendanceStatus === 'completed').length
  const partialSessions = sessionAdherence.filter((s) => s.attendanceStatus === 'partial').length
  const skippedSessions = sessionAdherence.filter((s) => s.attendanceStatus === 'skipped').length
  const cancelledSessions = sessionAdherence.filter((s) => s.attendanceStatus === 'cancelled').length
  const pendingSessions = sessionAdherence.filter(
    (s) => s.attendanceStatus === 'pending' || s.attendanceStatus === 'overdue'
  ).length

  const plannedSessions = weekPlannedWorkouts.length
  const adherenceRate = computeRate(weekPlannedWorkouts, attendanceById, config)

  let dataStatus: ProgramWeekAdherence['dataStatus']
  if (plannedSessions === 0) {
    dataStatus = 'insufficient_data'
  } else if (pendingSessions === plannedSessions) {
    dataStatus = 'future'
  } else if (pendingSessions === 0) {
    dataStatus = 'complete'
  } else {
    dataStatus = 'in_progress'
  }

  return {
    weekId,
    weekNumber,
    plannedSessions,
    completedSessions,
    partialSessions,
    skippedSessions,
    cancelledSessions,
    pendingSessions,
    extraSessions: extraSessionsInWeek.length,
    adherenceRate,
    dataStatus,
  }
}

// ─── Block adherence ───────────────────────────────────────────────────────────

export function computeBlockAdherence(
  block: TrainingBlock,
  weeksInBlock: ProgramWeekAdherence[]
): TrainingBlockAdherence {
  const plannedSessions = weeksInBlock.reduce((sum, w) => sum + w.plannedSessions, 0)
  const completedSessions = weeksInBlock.reduce((sum, w) => sum + w.completedSessions + w.partialSessions, 0)
  const skippedSessions = weeksInBlock.reduce((sum, w) => sum + w.skippedSessions, 0)
  const completedWeeks = weeksInBlock.filter((w) => w.dataStatus === 'complete').length
  const totalWeeks = weeksInBlock.length

  const withRate = weeksInBlock.filter((w) => w.adherenceRate !== undefined)
  const adherenceRate =
    withRate.length > 0
      ? withRate.reduce((sum, w) => sum + (w.adherenceRate ?? 0), 0) / withRate.length
      : undefined

  let status: TrainingBlockAdherence['status']
  if (weeksInBlock.every((w) => w.dataStatus === 'future')) {
    status = 'future'
  } else if (weeksInBlock.every((w) => w.dataStatus === 'complete' || w.dataStatus === 'insufficient_data')) {
    status = 'completed'
  } else {
    status = 'in_progress'
  }

  return {
    blockId: block.id,
    blockName: block.name,
    plannedSessions,
    completedSessions,
    skippedSessions,
    adherenceRate,
    completedWeeks,
    totalWeeks,
    status,
  }
}

// ─── Program adherence ─────────────────────────────────────────────────────────

export function computeProgramAdherence(
  program: Pick<TrainingProgram, 'id' | 'version' | 'weeks' | 'blocks'>,
  weekSummaries: ProgramWeekAdherence[],
  extraSessionsTotal: number
): TrainingProgramAdherence {
  const plannedSessions = weekSummaries.reduce((sum, w) => sum + w.plannedSessions, 0)
  const completedSessions = weekSummaries.reduce((sum, w) => sum + w.completedSessions, 0)
  const partialSessions = weekSummaries.reduce((sum, w) => sum + w.partialSessions, 0)
  const skippedSessions = weekSummaries.reduce((sum, w) => sum + w.skippedSessions, 0)
  const cancelledSessions = weekSummaries.reduce((sum, w) => sum + w.cancelledSessions, 0)

  const withRate = weekSummaries.filter((w) => w.adherenceRate !== undefined)
  const adherenceRate =
    withRate.length > 0
      ? withRate.reduce((sum, w) => sum + (w.adherenceRate ?? 0), 0) / withRate.length
      : undefined

  const blockSummaries: TrainingBlockAdherence[] = (program.blocks ?? []).map((block) => {
    const weeksInBlock = weekSummaries.filter(
      (w) => w.weekNumber >= block.startWeek && w.weekNumber <= block.endWeek
    )
    return computeBlockAdherence(block, weeksInBlock)
  })

  let status: TrainingProgramAdherence['status']
  if (weekSummaries.length === 0 || weekSummaries.every((w) => w.dataStatus === 'future')) {
    status = 'not_started'
  } else if (weekSummaries.every((w) => w.dataStatus === 'complete' || w.dataStatus === 'insufficient_data')) {
    status = 'completed'
  } else {
    status = 'in_progress'
  }

  return {
    programId: program.id,
    programVersion: program.version,
    plannedSessions,
    completedSessions,
    partialSessions,
    skippedSessions,
    cancelledSessions,
    extraSessions: extraSessionsTotal,
    adherenceRate,
    weekSummaries,
    blockSummaries,
    status,
  }
}

// ─── Extra sessions ────────────────────────────────────────────────────────────

/** Sessão concluída sem vínculo a nenhuma sessão planejada, dentro do período informado (Fase 15). */
export function identifyExtraSessions(
  completedWorkouts: CompletedWorkout[],
  startDate: string,
  endDate: string
): CompletedWorkout[] {
  return completedWorkouts.filter((w) => {
    if (w.source?.plannedWorkoutId) return false
    const date = w.completedAt.slice(0, 10)
    return date >= startDate && date <= endDate
  })
}

// ─── Integrity ────────────────────────────────────────────────────────────────

/** Nunca repara nada sozinho — apenas relata para que a UI (Parte 3B) ofereça reparo explícito. */
export function validateProgramExecutionIntegrity(
  plannedWorkouts: PlannedWorkout[],
  completedWorkouts: CompletedWorkout[]
): ProgramExecutionIntegrityReport {
  const completedIds = new Set(completedWorkouts.map((w) => w.id))
  const plannedIds = new Set(plannedWorkouts.map((w) => w.id))

  const plannedWithoutCompletedRecord = plannedWorkouts
    .filter((p) => p.execution?.completedWorkoutId && !completedIds.has(p.execution.completedWorkoutId))
    .map((p) => p.id)

  const completedWithoutPlannedRecord = completedWorkouts
    .filter((w) => w.source?.plannedWorkoutId && !plannedIds.has(w.source.plannedWorkoutId))
    .map((w) => w.id)

  const linkCounts = new Map<string, number>()
  for (const w of completedWorkouts) {
    if (!w.source?.plannedWorkoutId) continue
    linkCounts.set(w.source.plannedWorkoutId, (linkCounts.get(w.source.plannedWorkoutId) ?? 0) + 1)
  }
  const duplicateLinks = Array.from(linkCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([plannedWorkoutId]) => plannedWorkoutId)

  return {
    plannedWithoutCompletedRecord,
    completedWithoutPlannedRecord,
    duplicateLinks,
    invalidReschedules: [],
    reviewsWithoutProgram: [],
  }
}
