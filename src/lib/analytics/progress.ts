// Motor de Progress Report — Sprint 25 Parte 4A.
//
// Agregador puro de "resumo de progresso" (o exemplo literal da spec da
// sprint: "Últimos 30 dias / Treinos: 18 / Consistência: 92% / Volume: +14%
// / Carga: +9% / Recordes: 7 / Maior evolução: Supino Inclinado / Menor
// frequência: Posteriores"). O motor retorna DADOS ESTRUTURADOS — a UI monta
// o texto (Parte 4B). Nenhuma métrica é recalculada aqui: tudo vem por
// composição dos motores das Partes 1-3 (`computeConsistency`,
// `computePerformanceEvolution`, `getTopEvolvingExercises`,
// `computeMuscleGroupDistribution`) mais `personal-record-events.ts` para a
// contagem de recordes no período. Este arquivo é quase inteiramente
// composição/mapeamento — a única lógica nova é "menor frequência" (mínimo de
// `frequency` entre os 7 grupos musculares da distribuição).

import { getPersonalRecordEvents } from '../personal-record-events'
import { resolvePeriodRange, filterByDateRange } from './helpers'
import { computeConsistency } from './consistency'
import { computePerformanceEvolution, getTopEvolvingExercises } from './performance'
import { computeMuscleGroupDistribution } from './muscle-balance'
import type { MuscleGroup } from '../muscle-groups'
import type { AnalyticsPeriod } from './types'

export interface ProgressReport {
  period: AnalyticsPeriod
  /** Sessões concluídas no período — mesma contagem de `ConsistencyReport.completedSessions` (aderência ao plano quando há programa ativo, senão contagem bruta de treinos). */
  sessionsCompleted: number
  /**
   * Percentual de consistência (0-100) para exibição direta ("Consistência:
   * 92%"). Prioriza `monthlyAdherenceRate` (taxa da soma do período inteiro —
   * mais estável para um resumo de período) sobre `weeklyAdherenceRate`
   * (média de taxas semanais) quando ambos existem; `null` quando não há
   * nenhum programa ativo com sessões planejadas no período (mesma condição
   * de `ConsistencyReport`).
   */
  consistencyPercent: number | null
  /** `changePercent` de `computePerformanceEvolution` para a métrica 'volume' — sem recálculo. */
  volumeChangePercent: number | null
  /** `changePercent` de `computePerformanceEvolution` para a métrica 'load'. */
  loadChangePercent: number | null
  /** Contagem de `PersonalRecordEvent`s cujo `achievedAt` cai dentro do `DateRange` do período — único filtro novo deste arquivo, reaproveitando `filterByDateRange` (Parte 1). */
  recordsCount: number
  /** Exercício #1 de `getTopEvolvingExercises(period, 1)` — `null` quando nenhum exercício tem amostra suficiente. */
  topEvolvingExercise: { exerciseId: string; exerciseName: string } | null
  /** Grupo muscular com menor `frequency` (sessões no período) em `computeMuscleGroupDistribution` — `null` só é teoricamente impossível (a distribuição sempre retorna os 7 grupos canônicos), mas o tipo permanece nullable por defesa. */
  leastFrequentMuscleGroup: { muscleGroup: MuscleGroup; label: string } | null
}

export function buildProgressReport(period: AnalyticsPeriod, now: Date = new Date()): ProgressReport {
  const range = resolvePeriodRange(period, now)

  const consistency = computeConsistency(period, now)
  const evolutions = computePerformanceEvolution(period, now)
  const volumeEvolution = evolutions.find((e) => e.metric === 'volume')
  const loadEvolution = evolutions.find((e) => e.metric === 'load')

  const topEvolving = getTopEvolvingExercises(period, 1)
  const distribution = computeMuscleGroupDistribution(period, now)

  const recordsInPeriod = filterByDateRange(getPersonalRecordEvents(), range, (e) => e.achievedAt)

  const consistencyRate = consistency.monthlyAdherenceRate ?? consistency.weeklyAdherenceRate
  const consistencyPercent = consistencyRate !== null ? Math.round(consistencyRate * 100) : null

  const leastFrequent =
    distribution.length > 0
      ? distribution.reduce((min, entry) => (entry.frequency < min.frequency ? entry : min))
      : null

  return {
    period,
    sessionsCompleted: consistency.completedSessions,
    consistencyPercent,
    volumeChangePercent: volumeEvolution?.changePercent ?? null,
    loadChangePercent: loadEvolution?.changePercent ?? null,
    recordsCount: recordsInPeriod.length,
    topEvolvingExercise: topEvolving[0]
      ? { exerciseId: topEvolving[0].exerciseId, exerciseName: topEvolving[0].exerciseName }
      : null,
    leastFrequentMuscleGroup: leastFrequent
      ? { muscleGroup: leastFrequent.muscleGroup, label: leastFrequent.label }
      : null,
  }
}
