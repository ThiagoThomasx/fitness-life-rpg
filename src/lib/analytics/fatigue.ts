// Motor de Fadiga Analytics — Sprint 25 Parte 3.
//
// Cruza três eixos já existentes — prontidão subjetiva (`workout-readiness.ts`),
// recuperação por grupo muscular (`workout-recovery.ts`) e tendência de carga
// (`analytics/performance.ts`, Parte 2) — para observar PADRÕES, nunca para
// prescrever. Nenhuma linguagem médica ou de recomendação de ação aqui
// ("descanse", "procure um médico" etc.) — só observação factual com
// evidência numérica citada, no mesmo espírito de `adaptive-recommendations.ts`
// (regras determinísticas, gated por tamanho mínimo de amostra, nunca
// "recomendação" inventada sem dado).

import { getWorkoutHistory } from '../workout-history'
import { getAllExercises } from '../custom-workouts'
import { getCheckIns } from '../readiness-check-ins'
import { computeReadinessStats, type ReadinessStats } from '../workout-readiness'
import { getMuscleRecoveryStates, type MuscleRecoveryState } from '../workout-recovery'
import { ALL_MUSCLE_GROUPS } from '../training-load'
import type { MuscleGroup } from '../muscle-groups'
import { resolvePeriodRange, filterByDateRange } from './helpers'
import { computePerformanceEvolution, type PerformanceMetricKey } from './performance'
import type { AnalyticsPeriod, AnalyticsInsight, TrendDirection, MetricEvolution } from './types'

export interface FatigueReport {
  readiness: ReadinessStats
  /** Estado de recuperação ATUAL (ponto no tempo `now`) por grupo muscular — recuperação não é um conceito que se "escopa" a um período passado, por isso não é filtrada pelo `DateRange` do período como as outras métricas deste motor. */
  recoveryByMuscleGroup: Record<MuscleGroup, MuscleRecoveryState>
  loadTrend: TrendDirection
  patterns: AnalyticsInsight[]
  period: AnalyticsPeriod
}

// ─── Limiares de gating e detecção ──────────────────────────────────────────
//
// Mesma convenção de `adaptive-recommendations.ts`: nenhum padrão dispara sem
// amostra mínima, e os limiares de "prontidão baixa" reaproveitam o mesmo
// valor já usado lá (`LOW_READINESS_SHARE_THRESHOLD`), em vez de inventar um
// segundo número para o mesmo conceito.
const MIN_SESSIONS_FOR_PATTERN = 2
const MIN_CHECK_INS_FOR_PATTERN = 2
const LOW_READINESS_SHARE_THRESHOLD = 0.5
const MAJORITY_FATIGUED_SHARE_THRESHOLD = 0.5

/** Métrica de carga usada para o eixo de tendência e para os detectores de padrão: volume total (kg) do período — grandeza cumulativa, mais representativa de "carga acumulada" do que a média de topo de série ('load'). */
const LOAD_METRIC: PerformanceMetricKey = 'volume'

function findMetric(evolutions: MetricEvolution[], metric: PerformanceMetricKey): MetricEvolution | undefined {
  return evolutions.find((e) => e.metric === metric)
}

function lowReadinessShare(readiness: ReadinessStats): number | null {
  return readiness.totalCheckIns > 0 ? readiness.lowReadinessCount / readiness.totalCheckIns : null
}

function fatiguedMuscleGroupLabels(recovery: Record<MuscleGroup, MuscleRecoveryState>): string[] {
  return ALL_MUSCLE_GROUPS.filter((mg) => recovery[mg].status !== 'recovered').map((mg) => mg)
}

// ─── Detectores de padrão ────────────────────────────────────────────────────
//
// Cada detector retorna `null` quando não há amostra suficiente OU quando a
// condição não se confirma — nunca "força" um insight. Texto sempre
// observacional (o que coincidiu), nunca prescritivo (o que fazer).

function detectHighLoadLowReadiness(
  loadEvolution: MetricEvolution | undefined,
  readiness: ReadinessStats,
  workoutsInPeriodCount: number,
  period: AnalyticsPeriod
): AnalyticsInsight | null {
  if (workoutsInPeriodCount < MIN_SESSIONS_FOR_PATTERN) return null
  if (readiness.totalCheckIns < MIN_CHECK_INS_FOR_PATTERN) return null
  if (!loadEvolution || loadEvolution.direction !== 'increasing') return null

  const share = lowReadinessShare(readiness)
  if (share === null || share <= LOW_READINESS_SHARE_THRESHOLD) return null

  const changePercentLabel =
    loadEvolution.changePercent !== null ? `+${Math.round(loadEvolution.changePercent)}%` : 'em alta'

  return {
    id: `fatigue:high_load_low_readiness:${period}`,
    category: 'fatigue',
    severity: 'attention',
    title: 'Carga em alta coincidiu com prontidão baixa',
    explanation:
      'Nas sessões e check-ins recentes, o volume de treino cresceu ao mesmo tempo em que a prontidão relatada ficou baixa com frequência.',
    evidence: [
      `Carga (volume): ${changePercentLabel} em relação ao período anterior`,
      `Prontidão baixa em ${readiness.lowReadinessCount} de ${readiness.totalCheckIns} check-ins recentes`,
    ],
    period,
  }
}

function detectHighLoadMajorityFatigued(
  loadEvolution: MetricEvolution | undefined,
  recovery: Record<MuscleGroup, MuscleRecoveryState>,
  workoutsInPeriodCount: number,
  period: AnalyticsPeriod
): AnalyticsInsight | null {
  if (workoutsInPeriodCount < MIN_SESSIONS_FOR_PATTERN) return null
  if (!loadEvolution || loadEvolution.direction !== 'increasing') return null

  const fatiguedGroups = fatiguedMuscleGroupLabels(recovery)
  if (fatiguedGroups.length / ALL_MUSCLE_GROUPS.length <= MAJORITY_FATIGUED_SHARE_THRESHOLD) return null

  const changePercentLabel =
    loadEvolution.changePercent !== null ? `+${Math.round(loadEvolution.changePercent)}%` : 'em alta'

  return {
    id: `fatigue:high_load_majority_fatigued:${period}`,
    category: 'fatigue',
    severity: 'attention',
    title: 'Carga em alta coincidiu com a maioria dos grupos musculares ainda em recuperação',
    explanation:
      'O volume de treino cresceu enquanto a maior parte dos grupos musculares seguia em recuperação parcial ou fatigada.',
    evidence: [
      `Carga (volume): ${changePercentLabel} em relação ao período anterior`,
      `${fatiguedGroups.length} de ${ALL_MUSCLE_GROUPS.length} grupos musculares não totalmente recuperados no momento`,
    ],
    period,
  }
}

function detectLowReadinessDecliningPerformance(
  performanceEvolution: MetricEvolution | undefined,
  readiness: ReadinessStats,
  workoutsInPeriodCount: number,
  period: AnalyticsPeriod
): AnalyticsInsight | null {
  if (workoutsInPeriodCount < MIN_SESSIONS_FOR_PATTERN) return null
  if (readiness.totalCheckIns < MIN_CHECK_INS_FOR_PATTERN) return null
  if (!performanceEvolution || performanceEvolution.direction !== 'decreasing') return null

  const share = lowReadinessShare(readiness)
  if (share === null || share <= LOW_READINESS_SHARE_THRESHOLD) return null

  const changePercentLabel =
    performanceEvolution.changePercent !== null ? `${Math.round(performanceEvolution.changePercent)}%` : 'em queda'

  return {
    id: `fatigue:low_readiness_declining_performance:${period}`,
    category: 'fatigue',
    severity: 'attention',
    title: 'Prontidão baixa coincidiu com queda de desempenho',
    explanation:
      'Nos check-ins recentes com prontidão baixa, o desempenho estimado (1RM) também caiu em relação ao período anterior.',
    evidence: [
      `Prontidão baixa em ${readiness.lowReadinessCount} de ${readiness.totalCheckIns} check-ins recentes`,
      `1RM estimado: ${changePercentLabel} em relação ao período anterior`,
    ],
    period,
  }
}

/**
 * Sinais de fadiga para um período: prontidão (eixo subjetivo), recuperação
 * por grupo muscular (eixo objetivo, estado atual), tendência de carga
 * (reaproveita `computePerformanceEvolution` da Parte 2) e padrões
 * observacionais cruzando os três eixos. Nunca emite recomendação médica ou
 * prescritiva — apenas observa coincidências, sempre citando os números que
 * as sustentam.
 */
export function computeFatigueSignals(period: AnalyticsPeriod, now: Date = new Date()): FatigueReport {
  const range = resolvePeriodRange(period, now)
  const history = getWorkoutHistory()
  const workoutsInPeriod = filterByDateRange(history, range, (w) => w.completedAt)

  const checkInsInPeriod = filterByDateRange(getCheckIns(), range, (c) => c.createdAt)
  const readiness = computeReadinessStats(checkInsInPeriod)

  const recoveryByMuscleGroup = getMuscleRecoveryStates(history, getAllExercises(), now)

  const performanceEvolutions = computePerformanceEvolution(period, now)
  const loadEvolution = findMetric(performanceEvolutions, LOAD_METRIC)
  const oneRmEvolution = findMetric(performanceEvolutions, '1rm')
  const loadTrend: TrendDirection = loadEvolution?.direction ?? 'insufficient_data'

  const patterns: AnalyticsInsight[] = []
  const highLoadLowReadiness = detectHighLoadLowReadiness(loadEvolution, readiness, workoutsInPeriod.length, period)
  if (highLoadLowReadiness) patterns.push(highLoadLowReadiness)

  const highLoadMajorityFatigued = detectHighLoadMajorityFatigued(
    loadEvolution,
    recoveryByMuscleGroup,
    workoutsInPeriod.length,
    period
  )
  if (highLoadMajorityFatigued) patterns.push(highLoadMajorityFatigued)

  const lowReadinessDecliningPerformance = detectLowReadinessDecliningPerformance(
    oneRmEvolution,
    readiness,
    workoutsInPeriod.length,
    period
  )
  if (lowReadinessDecliningPerformance) patterns.push(lowReadinessDecliningPerformance)

  return {
    readiness,
    recoveryByMuscleGroup,
    loadTrend,
    patterns,
    period,
  }
}
