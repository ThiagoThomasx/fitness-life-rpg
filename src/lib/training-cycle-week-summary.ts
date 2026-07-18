// Detalhamento semana a semana de um ciclo — Sprint 17.1.
// Não recalcula volume/PRs/prontidão: reaproveita os mesmos motores usados
// por `training-cycle-summary.ts`. Adiciona apenas a dimensão de
// classificação manual (recuperação, teste, transição) por cima dos dados
// já existentes.

import { getWorkoutHistory } from './workout-history'
import { getWeekStart } from './weekly-plan'
import { getWeekEnd, sessionVolumeKg } from './training-load'
import { getCheckIns } from './readiness-check-ins'
import { computeReadinessStats } from './workout-readiness'
import { getAnnotationsByCycle, type CycleWeekType } from './training-cycle-weeks'
import type { TrainingCycle } from './training-cycles'

export interface CycleWeekBreakdown {
  weekNumber: number
  startDate: string
  endDate: string
  type: CycleWeekType
  notes?: string
  sessions: number
  volumeKg: number
  prs: number
  averageReadiness: number | null
}

export interface CycleWeekTypeCounts {
  normal: number
  recovery: number
  test: number
  transition: number
}

function inRange(dateStr: string, start: string, end: string): boolean {
  const date = dateStr.slice(0, 10)
  return date >= start && date <= end
}

/** Constrói todas as semanas do ciclo, incluindo a semana corrente (parcial) se ativo. */
export function buildCycleWeekBreakdown(cycle: TrainingCycle, now: Date = new Date()): CycleWeekBreakdown[] {
  const startDate = cycle.startDate
  const endDate = cycle.completedAt ? cycle.completedAt.slice(0, 10) : now.toISOString().slice(0, 10)

  const history = getWorkoutHistory()
  const checkIns = getCheckIns()
  const annotations = getAnnotationsByCycle(cycle.id)
  const annotationByWeek = new Map(annotations.map((a) => [a.weekStartDate, a]))

  const weeks: CycleWeekBreakdown[] = []
  let cursor = getWeekStart(new Date(startDate + 'T00:00:00'))
  const lastWeekStart = getWeekStart(new Date(endDate + 'T00:00:00'))
  let weekNumber = 0

  while (cursor <= lastWeekStart) {
    weekNumber++
    const weekEnd = getWeekEnd(cursor)
    // Não ultrapassa `endDate`: a última semana de um ciclo já encerrado pode
    // ser parcial, e treinos feitos depois do encerramento não pertencem a
    // este ciclo (mesmo que caiam na mesma semana de calendário).
    const effectiveWeekEnd = weekEnd < endDate ? weekEnd : endDate
    const workoutsInWeek = history.filter((w) => inRange(w.completedAt, cursor, effectiveWeekEnd))
    const checkInsInWeek = checkIns.filter((c) => inRange(c.createdAt, cursor, effectiveWeekEnd))
    const readinessStats = checkInsInWeek.length > 0 ? computeReadinessStats(checkInsInWeek) : null

    const annotation = annotationByWeek.get(cursor)

    weeks.push({
      weekNumber,
      startDate: cursor,
      endDate: weekEnd,
      type: annotation?.type ?? 'normal',
      notes: annotation?.notes,
      sessions: workoutsInWeek.length,
      volumeKg: workoutsInWeek.reduce((sum, w) => sum + sessionVolumeKg(w), 0),
      prs: workoutsInWeek.reduce((sum, w) => sum + w.prsCount, 0),
      averageReadiness: readinessStats
        ? Math.round(
            ((readinessStats.averageEnergy +
              readinessStats.averageSleep +
              (6 - readinessStats.averageSoreness) +
              readinessStats.averageMotivation) /
              4) *
              10
          ) / 10
        : null,
    })

    const d = new Date(cursor + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    cursor = d.toISOString().slice(0, 10)
  }

  return weeks
}

export function countWeeksByType(weeks: CycleWeekBreakdown[]): CycleWeekTypeCounts {
  return {
    normal: weeks.filter((w) => w.type === 'normal').length,
    recovery: weeks.filter((w) => w.type === 'recovery').length,
    test: weeks.filter((w) => w.type === 'test').length,
    transition: weeks.filter((w) => w.type === 'transition').length,
  }
}

/**
 * Nota textual sobre quedas de volume que coincidem com semanas classificadas
 * como recuperação/teste/transição — evita tratar a queda como regressão.
 * Não infere causalidade além do que a classificação manual já indica.
 */
export function buildWeekTypeTrendNote(weeks: CycleWeekBreakdown[]): string | null {
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1]
    const curr = weeks[i]
    if (prev.volumeKg === 0) continue
    const changePct = ((curr.volumeKg - prev.volumeKg) / prev.volumeKg) * 100
    if (changePct >= -10) continue

    if (curr.type === 'recovery') {
      const next = weeks[i + 1]
      if (next && next.volumeKg > curr.volumeKg) {
        return 'O volume caiu na semana de recuperação e voltou a subir depois.'
      }
      return 'O volume caiu na semana de recuperação, como esperado.'
    }
    if (curr.type === 'test') {
      return 'O volume caiu na semana de teste, quando o foco não é volume.'
    }
    if (curr.type === 'transition') {
      return 'O volume caiu na semana de transição entre blocos.'
    }
  }
  return null
}
