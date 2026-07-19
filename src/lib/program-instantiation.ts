// Instanciação de programa no Planner (Sprint 20 — Parte 1).
//
// Fluxo obrigatório: `previewProgramInstantiation` primeiro (só calcula
// datas e conflitos, não persiste nada), a UI mostra a prévia e resolve
// conflitos, e só então `instantiateProgramIntoPlanner` é chamado para
// efetivamente criar as `PlannedWorkout`s. Nada aqui roda automaticamente
// sem essa confirmação explícita da UI.

import type { TrainingProgram, TrainingProgramSession } from './training-programs'
import {
  getPlannedWorkoutsByDateRange,
  savePlannedWorkouts,
  deletePlannedWorkoutsInRange,
  type PlannedWorkout,
  type NewPlannedWorkoutInput,
} from './planned-workouts'

export type ProgramInstantiationConflictStrategy = 'keep' | 'replace' | 'skip' | 'cancel'

export interface ProgramInstantiationConflict {
  date: string
  existingSessionIds: string[]
  incomingSessionNames: string[]
}

export interface ProgramInstantiationSessionDate {
  weekId: string
  weekNumber: number
  sessionId: string
  session: TrainingProgramSession
  date: string
  weekday: number
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toDateOnly(date)
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay()
}

/** Próxima segunda-feira a partir de hoje (ou hoje, se já for segunda). */
export function getNextMonday(from: Date = new Date()): string {
  const date = new Date(from)
  const day = date.getDay()
  const diff = day === 1 ? 0 : ((8 - day) % 7 || 7)
  date.setDate(date.getDate() + (day === 1 ? 0 : diff))
  return toDateOnly(date)
}

export function getToday(): string {
  return toDateOnly(new Date())
}

/**
 * Calcula a data de cada sessão do programa a partir de uma data inicial.
 * Sessões com `dayIndex` usam offset direto dentro da semana. Sessões com
 * `preferredWeekday` são posicionadas no dia correspondente daquela semana.
 * Sessões sem nenhum dos dois ("dia flexível") ocupam o primeiro slot livre
 * da semana, em ordem — nunca fora do intervalo de 7 dias da semana.
 */
export function computeProgramInstantiationDates(
  program: TrainingProgram,
  startDate: string
): ProgramInstantiationSessionDate[] {
  const results: ProgramInstantiationSessionDate[] = []
  const sortedWeeks = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  const firstWeekNumber = sortedWeeks[0]?.weekNumber ?? 1

  for (const week of sortedWeeks) {
    const weekStart = addDays(startDate, (week.weekNumber - firstWeekNumber) * 7)
    const usedOffsets = new Set<number>()
    const flexibleSessions: TrainingProgramSession[] = []

    for (const session of week.sessions) {
      let offset: number | null = null
      if (session.dayIndex !== undefined) {
        offset = Math.min(6, Math.max(0, session.dayIndex))
      } else if (session.preferredWeekday !== undefined) {
        const startWeekday = weekdayOf(weekStart)
        offset = (session.preferredWeekday - startWeekday + 7) % 7
      }

      if (offset !== null) {
        usedOffsets.add(offset)
        const date = addDays(weekStart, offset)
        results.push({
          weekId: week.id,
          weekNumber: week.weekNumber,
          sessionId: session.id,
          session,
          date,
          weekday: weekdayOf(date),
        })
      } else {
        flexibleSessions.push(session)
      }
    }

    let cursor = 0
    for (const session of flexibleSessions) {
      while (usedOffsets.has(cursor) && cursor < 6) cursor++
      usedOffsets.add(cursor)
      const date = addDays(weekStart, cursor)
      results.push({
        weekId: week.id,
        weekNumber: week.weekNumber,
        sessionId: session.id,
        session,
        date,
        weekday: weekdayOf(date),
      })
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date))
}

function dateRangeOf(dates: ProgramInstantiationSessionDate[]): { start: string; end: string } | null {
  if (dates.length === 0) return null
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date))
  return { start: sorted[0].date, end: sorted[sorted.length - 1].date }
}

export function detectInstantiationConflicts(
  dates: ProgramInstantiationSessionDate[]
): ProgramInstantiationConflict[] {
  const range = dateRangeOf(dates)
  if (!range) return []

  const existing = getPlannedWorkoutsByDateRange(range.start, range.end)
  const existingByDate = new Map<string, PlannedWorkout[]>()
  for (const item of existing) {
    const list = existingByDate.get(item.date) ?? []
    list.push(item)
    existingByDate.set(item.date, list)
  }

  const incomingByDate = new Map<string, ProgramInstantiationSessionDate[]>()
  for (const item of dates) {
    const list = incomingByDate.get(item.date) ?? []
    list.push(item)
    incomingByDate.set(item.date, list)
  }

  const conflicts: ProgramInstantiationConflict[] = []
  for (const [date, incoming] of Array.from(incomingByDate)) {
    const existingAtDate = existingByDate.get(date)
    if (existingAtDate && existingAtDate.length > 0) {
      conflicts.push({
        date,
        existingSessionIds: existingAtDate.map((e) => e.id),
        incomingSessionNames: incoming.map((i) => i.session.name),
      })
    }
  }

  return conflicts.sort((a, b) => a.date.localeCompare(b.date))
}

export interface ProgramInstantiationPreview {
  dates: ProgramInstantiationSessionDate[]
  conflicts: ProgramInstantiationConflict[]
  totalSessions: number
  totalWeeks: number
  startDate: string
  endDate: string | null
}

/** Só calcula — não altera o Planner. A UI usa isso para mostrar a prévia (Fase 41). */
export function previewProgramInstantiation(
  program: TrainingProgram,
  startDate: string
): ProgramInstantiationPreview {
  const dates = computeProgramInstantiationDates(program, startDate)
  const conflicts = detectInstantiationConflicts(dates)
  const range = dateRangeOf(dates)
  return {
    dates,
    conflicts,
    totalSessions: dates.length,
    totalWeeks: program.weeks.length,
    startDate,
    endDate: range?.end ?? null,
  }
}

export interface InstantiateProgramResult {
  ok: boolean
  created: PlannedWorkout[]
  skippedDates: string[]
  cancelled: boolean
}

/**
 * Efetiva a instanciação — só deve ser chamada após o usuário confirmar a
 * prévia (e resolver conflitos, se houver). `strategy` decide o que fazer
 * quando já existem PlannedWorkouts nas datas calculadas:
 * - 'keep': adiciona as novas sessões mantendo as existentes
 * - 'replace': remove as existentes no intervalo do programa e insere as novas
 * - 'skip': pula datas em conflito, insere só o resto
 * - 'cancel': não faz nada
 */
export function instantiateProgramIntoPlanner(
  program: TrainingProgram,
  startDate: string,
  strategy: ProgramInstantiationConflictStrategy
): InstantiateProgramResult {
  if (strategy === 'cancel') {
    return { ok: true, created: [], skippedDates: [], cancelled: true }
  }

  const dates = computeProgramInstantiationDates(program, startDate)
  const conflicts = detectInstantiationConflicts(dates)
  const conflictDates = new Set(conflicts.map((c) => c.date))

  let toInsert = dates
  const skippedDates: string[] = []

  if (strategy === 'skip') {
    toInsert = dates.filter((d) => !conflictDates.has(d.date))
    skippedDates.push(...Array.from(conflictDates))
  } else if (strategy === 'replace') {
    const range = dateRangeOf(dates)
    if (range) deletePlannedWorkoutsInRange(range.start, range.end)
  }
  // 'keep' inserts everything alongside what already exists.

  const inputs: NewPlannedWorkoutInput[] = toInsert.map((d): NewPlannedWorkoutInput => ({
    date: d.date,
    weekday: d.weekday,
    name: d.session.name,
    templateSnapshot: d.session.templateSnapshot,
    isOptional: d.session.isOptional,
    notes: d.session.notes,
    source: {
      programId: program.id,
      programVersion: program.version,
      programWeekId: d.weekId,
      templateId: d.session.templateId,
      templateVersion: d.session.templateSnapshot.sourceTemplateVersion,
    },
  }))

  const created = inputs.length > 0 ? savePlannedWorkouts(inputs) : []
  return { ok: true, created, skippedDates, cancelled: false }
}
