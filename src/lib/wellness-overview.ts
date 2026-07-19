// Camada de composição para exibir associações bem-estar × treino em Insights — Sprint 19 Parte 3C.
//
// Não recalcula nada: apenas seleciona e prioriza resultados já produzidos por
// `wellness-associations.ts` (7 métricas de bem-estar × 3 métricas de treino) e
// expõe um resumo compacto do ciclo ativo via `training-cycle-wellness.ts`.
// Não persiste nada, não importa componentes; todos os dados de storage entram
// via parâmetros com defaults, para permanecer testável com dados injetados.

import { getCheckIns, type WorkoutReadinessCheckIn } from './readiness-check-ins'
import { getWeekSummaries, type WeekSummary } from './training-load'
import {
  computeAllWellnessTrainingAssociations,
  DEFAULT_WELLNESS_ASSOCIATION_CONFIG,
  type WellnessAssociation,
  type WellnessAssociationConfig,
  type WellnessMetric,
} from './wellness-associations'
import { getActiveCycle } from './training-cycles'
import { buildCycleWellnessSummary, type CycleWellnessSummary } from './training-cycle-wellness'

export type WellnessAssociationsDataStatus = 'available' | 'insufficient_data' | 'no_data'

export interface WellnessAssociationsOverview {
  associations: WellnessAssociation[]
  dataStatus: WellnessAssociationsDataStatus
  checkInCount: number
  weeksAnalyzed: number
}

const DEFAULT_MAX_ASSOCIATIONS = 5
const CONFIDENCE_RANK: Record<WellnessAssociation['confidence'], number> = { high: 3, medium: 2, low: 1 }

function rankAssociation(assoc: WellnessAssociation): number {
  const findingBonus = assoc.direction === 'positive' || assoc.direction === 'negative' ? 100 : 0
  return findingBonus + CONFIDENCE_RANK[assoc.confidence] * 10 + Math.min(assoc.sampleSize, 9)
}

/**
 * Mantém apenas a melhor associação por métrica de bem-estar (uma linha por
 * energia/sono/estresse/etc.), evitando repetir a mesma coincidência sob
 * métricas de treino diferentes (ex.: energia × frequência e energia × volume
 * quase sempre contam a mesma história).
 */
function bestPerWellnessMetric(associations: WellnessAssociation[]): WellnessAssociation[] {
  const byMetric = new Map<WellnessMetric, WellnessAssociation>()
  for (const assoc of associations) {
    const current = byMetric.get(assoc.wellnessMetric)
    if (!current || rankAssociation(assoc) > rankAssociation(current)) {
      byMetric.set(assoc.wellnessMetric, assoc)
    }
  }
  return Array.from(byMetric.values())
}

/**
 * Seleciona até `maxAssociations` associações bem-estar × treino para exibição
 * em Insights, priorizando achados com direção clara (positiva/negativa) e
 * maior confiança. Quando nenhuma associação tem amostra suficiente, retorna
 * `dataStatus: 'insufficient_data'` em vez de forçar uma lista vazia.
 */
export function buildWellnessAssociationsOverview(
  checkIns: WorkoutReadinessCheckIn[] = getCheckIns(),
  weekSummaries: WeekSummary[] = getWeekSummaries(26),
  config: WellnessAssociationConfig = DEFAULT_WELLNESS_ASSOCIATION_CONFIG,
  maxAssociations: number = DEFAULT_MAX_ASSOCIATIONS
): WellnessAssociationsOverview {
  if (checkIns.length === 0) {
    return { associations: [], dataStatus: 'no_data', checkInCount: 0, weeksAnalyzed: 0 }
  }

  const all = computeAllWellnessTrainingAssociations(checkIns, weekSummaries, config)
  const weeksAnalyzed = all.reduce((max, a) => Math.max(max, a.sampleSize), 0)

  const ranked = bestPerWellnessMetric(all).sort((a, b) => rankAssociation(b) - rankAssociation(a))
  const withFinding = ranked.filter((a) => a.direction === 'positive' || a.direction === 'negative')
  const selected = withFinding.length > 0 ? withFinding.slice(0, maxAssociations) : ranked.slice(0, maxAssociations)

  const dataStatus: WellnessAssociationsDataStatus =
    selected.length === 0 || withFinding.length === 0 ? 'insufficient_data' : 'available'

  return { associations: selected, dataStatus, checkInCount: checkIns.length, weeksAnalyzed }
}

export interface ActiveCycleWellnessOverview {
  cycleId: string
  cycleName: string
  summary: CycleWellnessSummary
}

/** Resumo compacto de bem-estar do ciclo ativo, para uso em Insights. Retorna `null` sem ciclo ativo. */
export function getActiveCycleWellnessOverview(now: Date = new Date()): ActiveCycleWellnessOverview | null {
  const cycle = getActiveCycle()
  if (!cycle) return null
  return {
    cycleId: cycle.id,
    cycleName: cycle.name,
    summary: buildCycleWellnessSummary(cycle, getCheckIns(), undefined, now),
  }
}
