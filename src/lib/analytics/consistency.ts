// Motor de Consistency Analytics — Sprint 25 Parte 2.
//
// Responde: aderência ao plano, sequência de dias treinados (streak), semanas
// perfeitas, melhor/pior mês — para um `AnalyticsPeriod`. Nunca recalcula
// aderência do zero: compõe `program-adherence.ts`/`program-progress.ts`
// (única fonte de verdade para "planejado vs. concluído"). O cálculo de
// streak é novo neste arquivo — não existia motor equivalente no projeto (ver
// nota abaixo) — mas reaproveita a MESMA convenção de gap já usada por
// `getNutritionStreak` (`nutrition.ts`): contagem regressiva a partir de hoje,
// dia a dia, sem tolerância de gap (a primeira ausência encerra a sequência).

import { getWorkoutHistory, type CompletedWorkout } from '../workout-history'
import { getActiveTrainingPrograms } from '../training-programs'
import { getPlannedWorkouts } from '../planned-workouts'
import { buildProgramAdherenceSnapshot } from '../program-progress'
import { resolvePeriodRange, filterByDateRange } from './helpers'
import type { AnalyticsPeriod } from './types'

export interface MonthlySessionCount {
  label: string
  completedSessions: number
}

export interface ConsistencyReport {
  weeklyAdherenceRate: number | null
  monthlyAdherenceRate: number | null
  plannedSessions: number
  completedSessions: number
  missedSessions: number
  longestStreakDays: number
  currentStreakDays: number
  perfectWeeksCount: number
  bestMonth: MonthlySessionCount | null
  worstMonth: MonthlySessionCount | null
  period: AnalyticsPeriod
}

function dateOnly(isoOrDateStr: string): string {
  return isoOrDateStr.slice(0, 10)
}

function addDaysToDateStr(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

// ─── Streaks ─────────────────────────────────────────────────────────────────
//
// Trabalha inteiramente em espaço de string de data UTC (nunca `Date` local)
// para não reintroduzir o tipo de mismatch de timezone já documentado no
// playbook de debug de hidratação deste projeto. LIMITAÇÃO DOCUMENTADA:
// streaks são calculados apenas sobre os treinos DENTRO do período
// selecionado — uma sequência que começou antes do início do período é
// truncada na borda do período (consistente com o resto do motor de
// Analytics, que sempre escopa por `DateRange`).
function computeWorkoutStreaks(
  workoutsInPeriod: CompletedWorkout[],
  now: Date
): { longestStreakDays: number; currentStreakDays: number } {
  if (workoutsInPeriod.length === 0) return { longestStreakDays: 0, currentStreakDays: 0 }

  const distinctDays = Array.from(new Set(workoutsInPeriod.map((w) => dateOnly(w.completedAt)))).sort()

  let longestStreakDays = 1
  let run = 1
  for (let i = 1; i < distinctDays.length; i++) {
    run = addDaysToDateStr(distinctDays[i - 1], 1) === distinctDays[i] ? run + 1 : 1
    if (run > longestStreakDays) longestStreakDays = run
  }

  const daySet = new Set(distinctDays)
  let currentStreakDays = 0
  let cursor = now.toISOString().slice(0, 10)
  while (daySet.has(cursor)) {
    currentStreakDays++
    cursor = addDaysToDateStr(cursor, -1)
  }

  return { longestStreakDays, currentStreakDays }
}

// ─── Melhor / pior mês ───────────────────────────────────────────────────────

function computeMonthlyBreakdown(workoutsInPeriod: CompletedWorkout[]): {
  bestMonth: MonthlySessionCount | null
  worstMonth: MonthlySessionCount | null
} {
  if (workoutsInPeriod.length === 0) return { bestMonth: null, worstMonth: null }

  const counts = new Map<string, number>()
  for (const w of workoutsInPeriod) {
    const label = w.completedAt.slice(0, 7) // YYYY-MM
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const entries = Array.from(counts.entries())
    .map(([label, completedSessions]) => ({ label, completedSessions }))
    .sort((a, b) => b.completedSessions - a.completedSessions)

  // Com um único mês no período, melhor e pior mês são o mesmo — comportamento
  // esperado, não um bug (não há segundo mês para comparar).
  return { bestMonth: entries[0], worstMonth: entries[entries.length - 1] }
}

// ─── Aderência (composta a partir de program-adherence.ts/program-progress.ts) ──
//
// Só quando existe pelo menos um programa ATIVO (`getActiveTrainingPrograms`
// já exclui arquivados) com sessões planejadas dentro do período: caso
// contrário os campos de taxa ficam `null` — nunca fabricamos um número sem
// base num plano real.
//
// `weeklyAdherenceRate` = média das taxas de aderência POR SEMANA do programa
// (`ProgramWeekAdherence.adherenceRate`, já calculado por `computeWeekAdherence`) —
// não ponderada por tamanho de semana.
// `monthlyAdherenceRate` = `completedSessions / plannedSessions` agregado do
// período inteiro (ponderado pelo total de sessões, não pela média de
// semanas) — uma segunda leitura da MESMA aderência, deliberadamente diferente
// de `weeklyAdherenceRate` (uma é média de taxas, a outra é taxa da soma),
// sem nenhuma matemática de aderência nova: os dois só agregam de formas
// diferentes o que `buildProgramAdherenceSnapshot` já produz.
interface AdherenceAccumulation {
  plannedSessions: number
  completedSessions: number
  missedSessions: number
  weeklyRateSum: number
  weeklyRateCount: number
  perfectWeeksCount: number
}

function accumulateProgramAdherence(
  workoutsInPeriod: CompletedWorkout[],
  rangeStartStr: string,
  rangeEndStr: string,
  todayStr: string
): AdherenceAccumulation {
  const acc: AdherenceAccumulation = {
    plannedSessions: 0,
    completedSessions: 0,
    missedSessions: 0,
    weeklyRateSum: 0,
    weeklyRateCount: 0,
    perfectWeeksCount: 0,
  }

  const activePrograms = getActiveTrainingPrograms()
  if (activePrograms.length === 0) return acc

  const plannedInRange = getPlannedWorkouts().filter((pw) => pw.date >= rangeStartStr && pw.date <= rangeEndStr)

  for (const program of activePrograms) {
    const plannedForProgram = plannedInRange.filter((pw) => pw.source?.programId === program.id)
    if (plannedForProgram.length === 0) continue

    const snapshot = buildProgramAdherenceSnapshot(program, plannedForProgram, workoutsInPeriod, todayStr)
    acc.plannedSessions += snapshot.plannedSessions
    acc.completedSessions += snapshot.completedSessions + snapshot.partialSessions
    // "Perdida" = explicitamente marcada como pulada (`skippedSessions`).
    // Sessões apenas pendentes/atrasadas não contam como perdidas aqui —
    // ainda podem ser concluídas.
    acc.missedSessions += snapshot.skippedSessions

    for (const week of snapshot.weekSummaries) {
      if (week.adherenceRate !== undefined) {
        acc.weeklyRateSum += week.adherenceRate
        acc.weeklyRateCount++
      }
      if (week.dataStatus === 'complete' && (week.adherenceRate ?? 0) >= 1) {
        acc.perfectWeeksCount++
      }
    }
  }

  return acc
}

/**
 * Relatório de consistência para um período: aderência ao plano (quando há
 * programa ativo com sessões planejadas no período), sequência de dias
 * treinados, semanas perfeitas e melhor/pior mês por volume de sessões.
 */
export function computeConsistency(period: AnalyticsPeriod, now: Date = new Date()): ConsistencyReport {
  const range = resolvePeriodRange(period, now)
  const history = getWorkoutHistory()
  const workoutsInPeriod = filterByDateRange(history, range, (w) => w.completedAt)

  const rangeStartStr = range.start.toISOString().slice(0, 10)
  const rangeEndStr = range.end.toISOString().slice(0, 10)
  const todayStr = now.toISOString().slice(0, 10)

  const adherence = accumulateProgramAdherence(workoutsInPeriod, rangeStartStr, rangeEndStr, todayStr)

  // Sem nenhum programa ativo com sessões planejadas no período:
  // `completedSessions` cai para a contagem bruta de treinos concluídos no
  // período (não há plano contra o qual medir "concluído do plano"), e
  // `plannedSessions`/`missedSessions` permanecem 0 — não há plano, não há
  // "perdido".
  const completedSessions = adherence.plannedSessions > 0 ? adherence.completedSessions : workoutsInPeriod.length

  const weeklyAdherenceRate = adherence.weeklyRateCount > 0 ? adherence.weeklyRateSum / adherence.weeklyRateCount : null
  const monthlyAdherenceRate =
    adherence.plannedSessions > 0 ? Math.min(1, adherence.completedSessions / adherence.plannedSessions) : null

  const { longestStreakDays, currentStreakDays } = computeWorkoutStreaks(workoutsInPeriod, now)
  const { bestMonth, worstMonth } = computeMonthlyBreakdown(workoutsInPeriod)

  return {
    weeklyAdherenceRate,
    monthlyAdherenceRate,
    plannedSessions: adherence.plannedSessions,
    completedSessions,
    missedSessions: adherence.missedSessions,
    longestStreakDays,
    currentStreakDays,
    perfectWeeksCount: adherence.perfectWeeksCount,
    bestMonth,
    worstMonth,
    period,
  }
}
