// Motor de Performance Analytics — Sprint 25 Parte 2.
//
// Camada de agregação (rollup) sobre TODO o histórico de treinos — evolução
// de carga/volume/1RM/repetições/frequência ao longo de um `AnalyticsPeriod`,
// sempre comparando o período atual com o período imediatamente anterior de
// duração igual (ex.: '30d' compara os últimos 30 dias com os 30 dias
// anteriores a esses). Nunca reimplementa matemática que já existe:
// - Janela de período e comparação percentual seguem `helpers.ts` (Parte 1).
// - Volume de sessão segue `sessionVolumeKg`/`sessionTotalSets`/`sessionTotalReps`
//   (`training-load.ts`).
// - "Quais exercícios estão crescendo/estagnados" segue `getTopGrowthExercises`/
//   `getStagnantExercises` (`exercise-records.ts`) — nunca recalculado aqui.
// Este arquivo NÃO substitui `exercise-intelligence.ts` (tendência por
// exercício individual) — é o rollup agregado de todos os exercícios juntos,
// usado pelo dashboard de Analytics (Partes 3-4).

import { getWorkoutHistory, type CompletedWorkout } from '../workout-history'
import { sessionVolumeKg, sessionTotalSets, sessionTotalReps } from '../training-load'
import { getTopGrowthExercises, getStagnantExercises, type ExerciseGrowthEntry } from '../exercise-records'
import { resolvePeriodRange, filterByDateRange, comparePeriods, sampleConfidence, type PeriodComparison } from './helpers'
import type { AnalyticsPeriod, DateRange, MetricEvolution } from './types'

export type PerformanceMetricKey = 'load' | 'volume' | '1rm' | 'reps' | 'frequency'

const PERFORMANCE_METRICS: PerformanceMetricKey[] = ['load', 'volume', '1rm', 'reps', 'frequency']

function maxOrZero(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values)
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Janela anterior de duração idêntica à janela atual, terminando exatamente
 * onde a janela atual começa (sem sobreposição). Espelha a comparação
 * "últimas N semanas vs. N semanas anteriores" do exemplo da spec da sprint.
 */
function previousRange(range: DateRange): DateRange {
  const durationMs = range.end.getTime() - range.start.getTime()
  return {
    start: new Date(range.start.getTime() - durationMs),
    end: new Date(range.start.getTime()),
  }
}

// ─── Agregadores por métrica ────────────────────────────────────────────────
//
// Escolhas de agregação (não óbvias, documentadas conforme pedido):
// - 'load': média, entre as sessões do período, da MAIOR carga (kg) registrada
//   em qualquer série da sessão ("top set" da sessão) — sessões sem nenhuma
//   série com peso > 0 (ex.: só exercícios de peso corporal) são ignoradas,
//   porque incluir 0 puxaria a média para baixo sem sinal real de carga.
// - 'volume': SOMA de `sessionVolumeKg` no período (não média) — volume é uma
//   grandeza cumulativa por natureza (mesma convenção de `getWeekSummaries`).
// - '1rm': média do `estimated1RMKg` já calculado por sessão/exercício em
//   `ExerciseRecord.estimated1RMKg` (não recalculado aqui — reaproveita o
//   valor persistido no histórico). Registros sem 1RM estimado (null/undefined)
//   são ignorados no cálculo da média.
// - 'reps': `sessionTotalReps` somado / `sessionTotalSets` somado no período —
//   média de repetições por série (não "reps por sessão"), para não distorcer
//   com sessões de tamanhos muito diferentes.
// - 'frequency': contagem de sessões (treinos concluídos) no período — SOMA,
//   igual a 'volume'.

function averageSessionTopLoadKg(workouts: CompletedWorkout[]): number {
  const topLoadsPerSession = workouts
    .map((w) => maxOrZero(w.exercises.flatMap((ex) => ex.sets.map((s) => s.weight_kg))))
    .filter((v) => v > 0)
  return average(topLoadsPerSession)
}

function totalVolumeKg(workouts: CompletedWorkout[]): number {
  return workouts.reduce((sum, w) => sum + sessionVolumeKg(w), 0)
}

function averageEstimated1RMKg(workouts: CompletedWorkout[]): number {
  const values = workouts
    .flatMap((w) => w.exercises.map((ex) => ex.estimated1RMKg))
    .filter((v): v is number => typeof v === 'number' && v > 0)
  return average(values)
}

function averageRepsPerSet(workouts: CompletedWorkout[]): number {
  const totalSets = workouts.reduce((sum, w) => sum + sessionTotalSets(w), 0)
  const totalReps = workouts.reduce((sum, w) => sum + sessionTotalReps(w), 0)
  return totalSets > 0 ? totalReps / totalSets : 0
}

function sessionCount(workouts: CompletedWorkout[]): number {
  return workouts.length
}

const METRIC_AGGREGATORS: Record<PerformanceMetricKey, (workouts: CompletedWorkout[]) => number> = {
  load: averageSessionTopLoadKg,
  volume: totalVolumeKg,
  '1rm': averageEstimated1RMKg,
  reps: averageRepsPerSet,
  frequency: sessionCount,
}

// ─── Formatação de explicação ────────────────────────────────────────────────
//
// Formato exigido pela spec da sprint (exemplo literal): "A média das
// últimas N dias foi X% maior/menor que os N dias anteriores." — nunca só
// uma seta/ícone. Centralizado aqui para não haver wording divergente entre
// as 5 métricas.

function formatEvolutionExplanation(
  periodDays: number,
  comparison: PeriodComparison,
  confidence: ReturnType<typeof sampleConfidence>
): string {
  if (confidence === 'insufficient') {
    return `Dados insuficientes nos últimos ${periodDays} dias para calcular esta métrica.`
  }

  if (comparison.changePercent === null) {
    if (comparison.direction === 'insufficient_data') {
      return `Dados insuficientes para comparar os últimos ${periodDays} dias com o período anterior.`
    }
    // previous === 0, current > 0: direção é clara mas não há base percentual válida.
    return `Sem atividade no período de ${periodDays} dias anterior para calcular uma variação percentual — houve atividade no período atual.`
  }

  const rounded = Math.round(Math.abs(comparison.changePercent))
  if (comparison.direction === 'stable') {
    return `A média dos últimos ${periodDays} dias ficou estável em relação aos ${periodDays} dias anteriores (variação de ${rounded}%).`
  }

  const word = comparison.direction === 'increasing' ? 'maior' : 'menor'
  return `A média dos últimos ${periodDays} dias foi ${rounded}% ${word} que os ${periodDays} dias anteriores.`
}

function buildInsufficientEvolution(metric: PerformanceMetricKey, period: AnalyticsPeriod, sampleSize: number): MetricEvolution {
  return {
    metric,
    direction: 'insufficient_data',
    changePercent: null,
    velocity: null,
    stability: 'unknown',
    sampleConfidence: sampleConfidence(sampleSize),
    explanation: `O período "Tudo" não tem um período anterior equivalente para comparação (${sampleSize} sessões no total).`,
    period,
  }
}

function buildMetricEvolution(
  metric: PerformanceMetricKey,
  period: AnalyticsPeriod,
  periodDays: number,
  currentWorkouts: CompletedWorkout[],
  previousWorkouts: CompletedWorkout[]
): MetricEvolution {
  const aggregate = METRIC_AGGREGATORS[metric]
  const currentValue = aggregate(currentWorkouts)
  const previousValue = aggregate(previousWorkouts)
  const comparison = comparePeriods(currentValue, previousValue)
  const confidence = sampleConfidence(currentWorkouts.length)

  // Sem dados de variância por ponto neste nível de rollup agregado (isso já
  // existe por exercício em `exercise-intelligence.ts`) — 'stability' aqui é
  // um proxy grosseiro derivado da própria comparação de período, não uma
  // classificação estatística real: 'stable' quando dentro da tolerância de
  // `comparePeriods`, 'unknown' sem amostra suficiente, 'volatile' caso contrário.
  const stability: MetricEvolution['stability'] =
    confidence === 'insufficient' ? 'unknown' : comparison.direction === 'stable' ? 'stable' : 'volatile'

  const velocity = comparison.changePercent !== null ? comparison.changePercent / periodDays : null

  return {
    metric,
    direction: comparison.direction,
    changePercent: comparison.changePercent,
    velocity,
    stability,
    sampleConfidence: confidence,
    explanation: formatEvolutionExplanation(periodDays, comparison, confidence),
    period,
  }
}

/**
 * Evolução agregada de carga/volume/1RM/repetições/frequência para um
 * período, comparando com o período anterior de duração igual. `'all'` não
 * tem período anterior equivalente (não há como comparar "tudo" com "antes
 * de tudo") — retorna `insufficient_data` para as 5 métricas nesse caso,
 * documentado explicitamente em vez de fabricar uma janela arbitrária.
 */
export function computePerformanceEvolution(period: AnalyticsPeriod, now: Date = new Date()): MetricEvolution[] {
  const range = resolvePeriodRange(period, now)
  const history = getWorkoutHistory()
  const currentWorkouts = filterByDateRange(history, range, (w) => w.completedAt)

  if (period === 'all') {
    return PERFORMANCE_METRICS.map((metric) => buildInsufficientEvolution(metric, period, currentWorkouts.length))
  }

  const previousWorkouts = filterByDateRange(history, previousRange(range), (w) => w.completedAt)
  const periodDays = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000))

  return PERFORMANCE_METRICS.map((metric) =>
    buildMetricEvolution(metric, period, periodDays, currentWorkouts, previousWorkouts)
  )
}

// ─── Exercícios em maior evolução / estagnados ──────────────────────────────
//
// LIMITAÇÃO CONHECIDA E DOCUMENTADA: `getTopGrowthExercises`/`getStagnantExercises`
// (`exercise-records.ts`) operam sempre sobre `getWorkoutHistory()` completo —
// não aceitam um `DateRange`/período como parâmetro. Não duplicamos aqui a
// lógica interna delas (comparação earliest-vs-latest por exercício) só para
// adicionar escopo de período, porque isso criaria uma segunda fonte de
// verdade para "o que é crescimento/estagnação de exercício" que poderia
// divergir da usada no restante do app (perfil, insights). `period` é aceito
// na assinatura por consistência de API com o resto do motor de Performance,
// mas o resultado reflete sempre o histórico completo até que
// `exercise-records.ts` ganhe suporte nativo a intervalo de datas.

export function getTopEvolvingExercises(period: AnalyticsPeriod, limit = 5): ExerciseGrowthEntry[] {
  void period
  return getTopGrowthExercises(limit)
}

export function getStagnantExercisesInPeriod(period: AnalyticsPeriod, limit = 5): ExerciseGrowthEntry[] {
  void period
  return getStagnantExercises(3, limit)
}
