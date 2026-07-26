// Camada de sinais do Coach — Sprint 26 Parte 2.
//
// Transforma os motores de Analytics já existentes (`analytics/dashboard.ts`
// como composição raiz, mais `exercise-intelligence.ts` e `exercise-records.ts`
// para detalhe por exercício) em um shape padronizado que as regras
// (`rules.ts`) consomem. NENHUM cálculo é refeito aqui — cada função só
// adapta o formato de saída de um motor existente. Se um dado não existe nos
// motores atuais, o sinal correspondente fica ausente/vazio; nunca é
// inventado.

import { buildDashboardAnalytics } from '../analytics/dashboard'
import type { ConsistencyReport } from '../analytics/consistency'
import type { MuscleBalanceReport, MuscleGroupDistributionEntry } from '../analytics/muscle-balance'
import type { ProgressReport } from '../analytics/progress'
import type { AnalyticsInsight, AnalyticsPeriod, MetricEvolution, TrendDirection } from '../analytics/types'
import type { ExerciseGrowthEntry } from '../exercise-records'
import { getRecentRecords, type RecentRecordEntry } from '../exercise-records'
import { getExerciseTrends, type ExerciseTrend } from '../exercise-intelligence'
import type { MuscleGroup } from '../muscle-groups'
import type { MuscleRecoveryState } from '../workout-recovery'
import type { ReadinessStats } from '../workout-readiness'

const RECENT_RECORDS_LIMIT = 10

export interface RecoverySignal {
  readiness: ReadinessStats
  recoveryByMuscleGroup: Record<MuscleGroup, MuscleRecoveryState>
  loadTrend: TrendDirection
  /** Padrões já cruzados por `analytics/fatigue.ts` (carga alta + prontidão baixa, etc.) — reaproveitados, não recalculados. */
  patterns: AnalyticsInsight[]
}

export type ConsistencySignal = ConsistencyReport

export interface MuscleBalanceSignal extends MuscleBalanceReport {
  distribution: MuscleGroupDistributionEntry[]
}

export interface ExerciseStagnationSignal {
  exerciseId: string
  exerciseName: string
  /** Tendência de carga (`load`) do exercício — mesma métrica usada por `getStagnantExercisesInPeriod`. */
  trend: ExerciseTrend
}

export interface PerformanceSignal {
  evolution: MetricEvolution[]
  topEvolving: ExerciseGrowthEntry[]
  stagnant: ExerciseGrowthEntry[]
  /** Detalhe por exercício estagnado (evidência numérica para a regra de progressão), derivado de `getExerciseTrends`. */
  stagnationDetails: ExerciseStagnationSignal[]
}

export interface TrainingLoadSignal {
  loadTrend: TrendDirection
  volumeChangePercent: number | null
}

export interface RecordsSignal {
  recent: RecentRecordEntry[]
}

export interface CoachSignals {
  period: AnalyticsPeriod
  generatedAt: string
  recovery: RecoverySignal
  consistency: ConsistencySignal
  muscleBalance: MuscleBalanceSignal
  performance: PerformanceSignal
  trainingLoad: TrainingLoadSignal
  records: RecordsSignal
  progress: ProgressReport
  insights: AnalyticsInsight[]
}

function buildStagnationDetails(stagnant: ExerciseGrowthEntry[]): ExerciseStagnationSignal[] {
  const details: ExerciseStagnationSignal[] = []
  for (const entry of stagnant) {
    const trends = getExerciseTrends(entry.exerciseId)
    const loadTrend = trends.find((t) => t.metric === 'load')
    if (loadTrend) {
      details.push({ exerciseId: entry.exerciseId, exerciseName: entry.exerciseName, trend: loadTrend })
    }
  }
  return details
}

function findVolumeChangePercent(evolution: MetricEvolution[]): number | null {
  return evolution.find((e) => e.metric === 'volume')?.changePercent ?? null
}

/**
 * Composição única de todos os sinais do Coach para um período. Chama
 * `buildDashboardAnalytics` (ponto de entrada já existente do Analytics 2.0)
 * exatamente uma vez e reaproveita seus resultados internos — só
 * `getExerciseTrends` (por exercício estagnado) e `getRecentRecords` são
 * chamadas adicionais, ambas motores já existentes.
 */
export function buildCoachSignals(period: AnalyticsPeriod, now: Date = new Date()): CoachSignals {
  const dashboard = buildDashboardAnalytics(period, now)

  return {
    period,
    generatedAt: now.toISOString(),
    recovery: {
      readiness: dashboard.fatigue.readiness,
      recoveryByMuscleGroup: dashboard.fatigue.recoveryByMuscleGroup,
      loadTrend: dashboard.fatigue.loadTrend,
      patterns: dashboard.fatigue.patterns,
    },
    consistency: dashboard.consistency,
    muscleBalance: {
      ...dashboard.muscleBalance.imbalances,
      distribution: dashboard.muscleBalance.distribution,
    },
    performance: {
      evolution: dashboard.performance.evolution,
      topEvolving: dashboard.performance.topEvolving,
      stagnant: dashboard.performance.stagnant,
      stagnationDetails: buildStagnationDetails(dashboard.performance.stagnant),
    },
    trainingLoad: {
      loadTrend: dashboard.fatigue.loadTrend,
      volumeChangePercent: findVolumeChangePercent(dashboard.performance.evolution),
    },
    records: {
      recent: getRecentRecords(RECENT_RECORDS_LIMIT),
    },
    progress: dashboard.progress,
    insights: dashboard.insights,
  }
}
