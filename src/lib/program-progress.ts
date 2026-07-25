// Progresso operacional de programa — Sprint 21 Parte 3.
//
// Motor puro: monta os agregados (semana, próximo treino, pontualidade,
// sessão com maior desvio) que a Parte 1/2 já tornaram possíveis, sem
// duplicar `program-adherence.ts` ou `planned-performed-comparison.ts` —
// só orquestra dados já calculados por eles. Nunca acessa storage.

import type { PlannedWorkout } from './planned-workouts'
import type { CompletedWorkout } from './workout-history'
import type { TrainingProgram } from './training-programs'
import {
  computeWeekAdherence,
  computeProgramAdherence,
  computeSessionAdherence,
  identifyExtraSessions,
  type ProgramWeekAdherence,
  type TrainingProgramAdherence,
  type ProgramAdherenceConfig,
  DEFAULT_PROGRAM_ADHERENCE_CONFIG,
} from './program-adherence'

// ─── Agrupamento por semana do programa ────────────────────────────────────────

export interface ProgramWeekGroup {
  weekId: string
  weekNumber: number
  items: PlannedWorkout[]
}

/** Só agrupa itens com vínculo completo ao programa (Fase 42/43 da Sprint 20) — planejamentos avulsos nunca entram aqui. */
export function groupPlannedWorkoutsByProgramWeek(
  plannedWorkouts: PlannedWorkout[],
  programId: string
): ProgramWeekGroup[] {
  const groups = new Map<string, ProgramWeekGroup>()
  for (const pw of plannedWorkouts) {
    const weekId = pw.source?.programId === programId ? pw.source.programWeekId : undefined
    const weekNumber = pw.source?.programId === programId ? pw.source.programWeekNumber : undefined
    if (!weekId || weekNumber === undefined) continue
    const existing = groups.get(weekId)
    if (existing) existing.items.push(pw)
    else groups.set(weekId, { weekId, weekNumber, items: [pw] })
  }
  return Array.from(groups.values()).sort((a, b) => a.weekNumber - b.weekNumber)
}

function dateRangeOf(items: PlannedWorkout[]): { start: string; end: string } | null {
  if (items.length === 0) return null
  const dates = items.map((i) => i.date).sort()
  return { start: dates[0], end: dates[dates.length - 1] }
}

/**
 * Monta `TrainingProgramAdherence` completo a partir de dados brutos.
 * Sessões extras são detectadas dentro da janela de datas de cada semana —
 * uma extra fora de qualquer janela planejada (ex.: entre duas semanas) não
 * é contada em nenhuma; é uma limitação conhecida, documentada, preferível a
 * um critério mais complexo de atribuição de janela.
 */
export function buildProgramAdherenceSnapshot(
  program: Pick<TrainingProgram, 'id' | 'version' | 'weeks' | 'blocks'>,
  plannedWorkouts: PlannedWorkout[],
  completedWorkouts: CompletedWorkout[],
  today: string,
  config: ProgramAdherenceConfig = DEFAULT_PROGRAM_ADHERENCE_CONFIG
): TrainingProgramAdherence {
  const completedById = new Map(completedWorkouts.map((w) => [w.id, w]))
  const groups = groupPlannedWorkoutsByProgramWeek(plannedWorkouts, program.id)

  let extraSessionsTotal = 0
  const weekSummaries: ProgramWeekAdherence[] = groups.map((group) => {
    const range = dateRangeOf(group.items)
    const extraInWeek = range ? identifyExtraSessions(completedWorkouts, range.start, range.end) : []
    extraSessionsTotal += extraInWeek.length
    return computeWeekAdherence(group.items, group.weekId, group.weekNumber, completedById, extraInWeek, today, config)
  })

  return computeProgramAdherence(program, weekSummaries, extraSessionsTotal)
}

// ─── Próximo treino / operacional ──────────────────────────────────────────────

export function findNextPlannedWorkout(
  plannedWorkouts: PlannedWorkout[],
  programId: string,
  today: string
): PlannedWorkout | undefined {
  return plannedWorkouts
    .filter((pw) => pw.source?.programId === programId && pw.status === 'pending' && pw.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

/**
 * Taxa de pontualidade — proporção de sessões concluídas realizadas
 * `on_time` entre as que têm `completionTiming` registrado (Parte 1). Sessões
 * concluídas antes da Parte 1 existir (sem o campo) ficam fora do cálculo —
 * dado ausente nunca vira "não pontual".
 */
export function computeOnTimeRate(plannedWorkouts: PlannedWorkout[], programId: string): number | undefined {
  const withTiming = plannedWorkouts.filter(
    (pw) => pw.source?.programId === programId && pw.status === 'done' && pw.execution?.completionTiming
  )
  if (withTiming.length === 0) return undefined
  const onTime = withTiming.filter((pw) => pw.execution?.completionTiming === 'on_time').length
  return onTime / withTiming.length
}

/**
 * Sessão concluída do programa com o menor `exerciseMatchRate` — usada como
 * "treino com maior desvio" (seção 12 da spec). `undefined` quando não há
 * dados suficientes ou quando a pior sessão ainda bate 100% (sem desvio real).
 */
export function findMostDeviatedSession(
  plannedWorkouts: PlannedWorkout[],
  completedWorkouts: CompletedWorkout[],
  programId: string,
  today: string,
  config: ProgramAdherenceConfig = DEFAULT_PROGRAM_ADHERENCE_CONFIG
): PlannedWorkout | undefined {
  const completedById = new Map(completedWorkouts.map((w) => [w.id, w]))
  const programItems = plannedWorkouts.filter((pw) => pw.source?.programId === programId && pw.status === 'done')
  const adherence = computeSessionAdherence(programItems, completedById, today, config)
  const withRate = adherence.filter((a) => a.exerciseMatchRate !== undefined)
  if (withRate.length === 0) return undefined

  const worst = withRate.reduce((min, a) => ((a.exerciseMatchRate ?? 1) < (min.exerciseMatchRate ?? 1) ? a : min))
  if (worst.exerciseMatchRate === undefined || worst.exerciseMatchRate >= 1) return undefined
  return programItems.find((pw) => pw.id === worst.plannedWorkoutId)
}

// ─── Rótulos de status (uso compartilhado pela UI) ─────────────────────────────

export type ProgramAdherenceLabel = 'Excelente' | 'Boa consistência' | 'Inconsistente' | 'Baixa adesão' | 'Dados insuficientes'

export function adherenceRateLabel(rate: number | undefined): ProgramAdherenceLabel {
  if (rate === undefined) return 'Dados insuficientes'
  if (rate >= 0.9) return 'Excelente'
  if (rate >= 0.75) return 'Boa consistência'
  if (rate >= 0.5) return 'Inconsistente'
  return 'Baixa adesão'
}
