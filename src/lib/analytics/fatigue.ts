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
import { getMetricBaseline, getSummaryRange, summaryMetricValue } from '../health-data'
import type { HealthDataQuality } from '../health-data'

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

// ─── Sinais objetivos de Health Data (Sprint 28 Parte 4) ────────────────────
//
// Independentes dos eixos acima — nunca substituem prontidão subjetiva ou
// recuperação muscular, só adicionam padrões observacionais quando há dados
// de saúde confiáveis o suficiente. Sempre gated por: qualidade não-baixa,
// ausência de conflito grave naquele dia, e uma linha de base com amostra
// mínima (ver `health-data/baseline.ts`). Janela de baseline fixa em 30
// dias (independente do `period` do relatório) porque comparar contra uma
// baseline calculada no mesmo período curto do "recente" não faz sentido —
// ver regra 15 do brief da Parte 4 ("não misturar períodos sem documentar").
const HEALTH_BASELINE_PERIOD: AnalyticsPeriod = '30d'
const HEALTH_RECENT_WINDOW_DAYS = 3
const SLEEP_DEFICIT_MINUTES = 60
const RESTING_HR_ELEVATED_BPM = 5
const STEPS_ABOVE_BASELINE_PERCENT = 30
const ACTIVITY_ABOVE_BASELINE_PERCENT = 25

interface RecentHealthDay {
  date: string
  value: number
}

function isUsableQuality(quality: HealthDataQuality): boolean {
  return quality.level !== 'low'
}

/**
 * A baseline precisa ser calculada com dados ANTERIORES à janela recente que
 * está sendo avaliada — caso contrário, os próprios dias "recorrentes"
 * inflacionariam a média e diluiriam o próprio desvio que o padrão tenta
 * detectar. Desloca `now` para trás pelo tamanho da janela recente antes de
 * pedir a baseline.
 */
function baselineReferenceDate(now: Date): Date {
  return new Date(now.getTime() - HEALTH_RECENT_WINDOW_DAYS * 86_400_000)
}

/**
 * Últimos `HEALTH_RECENT_WINDOW_DAYS` dias com valor confiável para a
 * métrica — exclui dias com qualidade baixa ou conflito grave naquele dia
 * (nunca soma/mistura dias não confiáveis num padrão "recorrente").
 */
function recentReliableDays(
  metric: 'sleep_duration' | 'resting_heart_rate' | 'steps' | 'activity_duration',
  now: Date
): RecentHealthDay[] {
  const summaries = getSummaryRange('7d', now).slice(0, HEALTH_RECENT_WINDOW_DAYS)
  const days: RecentHealthDay[] = []
  for (const summary of summaries) {
    const value = summaryMetricValue(summary, metric)
    if (value === undefined) continue
    if (!isUsableQuality(summary.quality)) continue
    const hasBlockingConflict = summary.conflicts.some(
      (c) => c.metric === metric && (c.severity === 'medium' || c.severity === 'high')
    )
    if (hasBlockingConflict) continue
    days.push({ date: summary.date, value })
  }
  return days
}

function detectSleepDeficitRecurring(period: AnalyticsPeriod, now: Date): AnalyticsInsight | null {
  const baseline = getMetricBaseline('sleep_duration', HEALTH_BASELINE_PERIOD, baselineReferenceDate(now))
  if (!baseline) return null

  const recentDays = recentReliableDays('sleep_duration', now)
  if (recentDays.length < HEALTH_RECENT_WINDOW_DAYS) return null
  if (!recentDays.every((d) => baseline.value - d.value >= SLEEP_DEFICIT_MINUTES)) return null

  const avgDeficit = Math.round(
    recentDays.reduce((sum, d) => sum + (baseline.value - d.value), 0) / recentDays.length
  )

  return {
    id: `fatigue:health_sleep_deficit:${period}`,
    category: 'fatigue',
    severity: 'attention',
    title: 'Sono abaixo da linha de base por dias seguidos',
    explanation:
      'Nas últimas noites registradas em Dados de saúde, o sono ficou consistentemente abaixo da sua média recente.',
    evidence: [
      `Linha de base de sono: ${Math.round(baseline.value)} min (amostra de ${baseline.sampleSize} dias)`,
      `Últimos ${recentDays.length} dias com dado confiável, em média ${avgDeficit} min abaixo da linha de base`,
    ],
    period,
  }
}

function detectRestingHrElevatedRecurring(period: AnalyticsPeriod, now: Date): AnalyticsInsight | null {
  const baseline = getMetricBaseline('resting_heart_rate', HEALTH_BASELINE_PERIOD, baselineReferenceDate(now))
  if (!baseline) return null

  const recentDays = recentReliableDays('resting_heart_rate', now)
  if (recentDays.length < HEALTH_RECENT_WINDOW_DAYS) return null
  if (!recentDays.every((d) => d.value - baseline.value >= RESTING_HR_ELEVATED_BPM)) return null

  const avgDelta = Math.round(
    recentDays.reduce((sum, d) => sum + (d.value - baseline.value), 0) / recentDays.length
  )

  return {
    id: `fatigue:health_resting_hr_elevated:${period}`,
    category: 'fatigue',
    severity: 'attention',
    title: 'Frequência cardíaca de repouso acima da linha de base por dias seguidos',
    explanation:
      'Nos últimos dias registrados em Dados de saúde, a frequência cardíaca de repouso ficou consistentemente acima da sua média recente.',
    evidence: [
      `Linha de base de FC de repouso: ${Math.round(baseline.value)} bpm (amostra de ${baseline.sampleSize} dias)`,
      `Últimos ${recentDays.length} dias com dado confiável, em média +${avgDelta} bpm acima da linha de base`,
    ],
    period,
  }
}

function detectHighExternalActivityRecurring(period: AnalyticsPeriod, now: Date): AnalyticsInsight | null {
  const reference = baselineReferenceDate(now)
  const stepsBaseline = getMetricBaseline('steps', HEALTH_BASELINE_PERIOD, reference)
  const activityBaseline = getMetricBaseline('activity_duration', HEALTH_BASELINE_PERIOD, reference)

  const stepsDays = stepsBaseline ? recentReliableDays('steps', now) : []
  const activityDays = activityBaseline ? recentReliableDays('activity_duration', now) : []

  const stepsElevated =
    stepsBaseline !== null &&
    stepsBaseline.value > 0 &&
    stepsDays.length >= HEALTH_RECENT_WINDOW_DAYS &&
    stepsDays.every((d) => ((d.value - stepsBaseline.value) / stepsBaseline.value) * 100 >= STEPS_ABOVE_BASELINE_PERCENT)

  const activityElevated =
    activityBaseline !== null &&
    activityBaseline.value > 0 &&
    activityDays.length >= HEALTH_RECENT_WINDOW_DAYS &&
    activityDays.every(
      (d) => ((d.value - activityBaseline.value) / activityBaseline.value) * 100 >= ACTIVITY_ABOVE_BASELINE_PERCENT
    )

  if (!stepsElevated && !activityElevated) return null

  const evidence: string[] = []
  if (stepsElevated && stepsBaseline) {
    evidence.push(`Passos: linha de base de ${Math.round(stepsBaseline.value)}, ${HEALTH_RECENT_WINDOW_DAYS} dias seguidos ${STEPS_ABOVE_BASELINE_PERCENT}%+ acima`)
  }
  if (activityElevated && activityBaseline) {
    evidence.push(`Atividade: linha de base de ${Math.round(activityBaseline.value)} min, ${HEALTH_RECENT_WINDOW_DAYS} dias seguidos ${ACTIVITY_ABOVE_BASELINE_PERCENT}%+ acima`)
  }

  return {
    id: `fatigue:health_high_external_activity:${period}`,
    category: 'fatigue',
    severity: 'info',
    title: 'Atividade externa acima da linha de base por dias seguidos',
    explanation:
      'Passos e/ou minutos de atividade registrados em Dados de saúde ficaram consistentemente acima da sua média recente, fora do treino planejado.',
    evidence,
    period,
  }
}

function detectRecoveryMismatch(
  period: AnalyticsPeriod,
  now: Date,
  loadTrend: TrendDirection,
  sleepDeficit: AnalyticsInsight | null,
  restingHrElevated: AnalyticsInsight | null
): AnalyticsInsight | null {
  if (loadTrend !== 'increasing') return null
  if (!sleepDeficit || !restingHrElevated) return null

  return {
    id: `fatigue:health_recovery_mismatch:${period}`,
    category: 'fatigue',
    severity: 'attention',
    title: 'Carga em alta coincidiu com sinais objetivos de recuperação insuficiente',
    explanation:
      'O volume de treino cresceu ao mesmo tempo em que sono e frequência cardíaca de repouso indicaram recuperação sistêmica abaixo do habitual.',
    evidence: [...sleepDeficit.evidence, ...restingHrElevated.evidence],
    period,
  }
}

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

  const sleepDeficit = detectSleepDeficitRecurring(period, now)
  if (sleepDeficit) patterns.push(sleepDeficit)

  const restingHrElevated = detectRestingHrElevatedRecurring(period, now)
  if (restingHrElevated) patterns.push(restingHrElevated)

  const highExternalActivity = detectHighExternalActivityRecurring(period, now)
  if (highExternalActivity) patterns.push(highExternalActivity)

  const recoveryMismatch = detectRecoveryMismatch(period, now, loadTrend, sleepDeficit, restingHrElevated)
  if (recoveryMismatch) patterns.push(recoveryMismatch)

  return {
    readiness,
    recoveryByMuscleGroup,
    loadTrend,
    patterns,
    period,
  }
}
