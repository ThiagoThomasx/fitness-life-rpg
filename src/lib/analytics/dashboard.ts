// Motor de Dashboard Analytics — Sprint 25 Parte 4A.
//
// Ponto de entrada único que a futura UI de Analytics (Parte 4B) vai chamar:
// composição PURA de todos os motores já construídos (Partes 1-4A) — chama
// cada um exatamente uma vez e monta o resultado. Nenhuma lógica de negócio
// nova aqui, mesmo padrão de "compor, nunca recalcular" já documentado no
// cabeçalho de `workout-detail-engine.ts`.
//
// Sobre performance: este módulo é uma função pura simples de propósito —
// NÃO memoiza internamente (uma função pura memoizada por argumentos como
// `now: Date` na prática nunca bate cache, e criaria uma segunda fonte de
// estado para um motor que deve ser barato de raciocinar sobre). Memoização
// real (via `useMemo`, chaveada por `period` + um sinal de mudança do
// histórico de treinos) é responsabilidade da camada React que consome
// `buildDashboardAnalytics` — construir aqui uma camada de cache seria
// over-engineering para esta sprint (YAGNI).

import {
  computePerformanceEvolution,
  getTopEvolvingExercises,
  getStagnantExercisesInPeriod,
} from './performance'
import { computeConsistency, type ConsistencyReport } from './consistency'
import { computeMuscleGroupDistribution, identifyImbalances, type MuscleBalanceReport } from './muscle-balance'
import { computeFatigueSignals, type FatigueReport } from './fatigue'
import { buildProgressReport, type ProgressReport } from './progress'
import { generateInsights } from './insights'
import type { AnalyticsPeriod, AnalyticsInsight, MetricEvolution } from './types'
import type { ExerciseGrowthEntry } from '../exercise-records'
import type { MuscleGroupDistributionEntry } from './muscle-balance'

export interface DashboardPerformanceSection {
  evolution: MetricEvolution[]
  topEvolving: ExerciseGrowthEntry[]
  stagnant: ExerciseGrowthEntry[]
}

export interface DashboardMuscleBalanceSection {
  distribution: MuscleGroupDistributionEntry[]
  imbalances: MuscleBalanceReport
}

export interface DashboardAnalytics {
  period: AnalyticsPeriod
  performance: DashboardPerformanceSection
  consistency: ConsistencyReport
  muscleBalance: DashboardMuscleBalanceSection
  fatigue: FatigueReport
  progress: ProgressReport
  insights: AnalyticsInsight[]
}

const TOP_EVOLVING_LIMIT = 5
const STAGNANT_LIMIT = 5

/**
 * Compõe todos os motores de Analytics (Partes 1-4A) para um período em uma
 * única chamada. Cada motor é invocado exatamente uma vez; nenhum dado é
 * recalculado entre seções (ex.: `fatigue.loadTrend` já reaproveita
 * `computePerformanceEvolution` internamente, e `progress` reaproveita
 * `consistency`/`performance`/`muscleBalance` — este arquivo não duplica
 * nenhuma dessas chamadas internas, só as expõe).
 */
export function buildDashboardAnalytics(period: AnalyticsPeriod, now: Date = new Date()): DashboardAnalytics {
  const performance: DashboardPerformanceSection = {
    evolution: computePerformanceEvolution(period, now),
    topEvolving: getTopEvolvingExercises(period, TOP_EVOLVING_LIMIT),
    stagnant: getStagnantExercisesInPeriod(period, STAGNANT_LIMIT),
  }

  const muscleBalance: DashboardMuscleBalanceSection = {
    distribution: computeMuscleGroupDistribution(period, now),
    imbalances: identifyImbalances(period, now),
  }

  return {
    period,
    performance,
    consistency: computeConsistency(period, now),
    muscleBalance,
    fatigue: computeFatigueSignals(period, now),
    progress: buildProgressReport(period, now),
    insights: generateInsights(period, now),
  }
}
