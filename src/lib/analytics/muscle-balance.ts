// Motor de Balanceamento Muscular — Sprint 25 Parte 3.
//
// Responde: como as séries/volume se distribuem entre os 7 grupos musculares
// canônicos num período, quais grupos estão negligenciados/excessivos, e as
// razões push/pull e superior/inferior. Nunca recalcula atribuição de
// séries/volume por grupo muscular do zero: reaproveita `buildMuscleGroupLoads`
// (`training-load.ts`, exportada nesta sprint especificamente para este reuso)
// e `getSessionPrimaryMuscleGroups` — inclui a MESMA limitação conhecida e já
// documentada lá: todo o volume de um exercício é atribuído apenas ao seu
// PRIMEIRO grupo muscular normalizado (sem distribuição secundária). Corrigir
// isso seria mexer em lógica de negócio já existente — fora de escopo aqui
// (CLAUDE.md regra 2).

import { getWorkoutHistory, type CompletedWorkout } from '../workout-history'
import { getAllExercises } from '../custom-workouts'
import {
  ALL_MUSCLE_GROUPS,
  buildMuscleGroupLoads,
  getSessionPrimaryMuscleGroups,
  sessionVolumeKg,
  sessionTotalSets,
  sessionTotalReps,
  DEFAULT_TRAINING_LOAD_CONFIG,
  type CompletedSessionSummary,
} from '../training-load'
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '../muscle-groups'
import { resolvePeriodRange, filterByDateRange } from './helpers'
import type { AnalyticsPeriod } from './types'

export interface MuscleGroupDistributionEntry {
  muscleGroup: MuscleGroup
  label: string
  sets: number
  volumeKg: number
  /** Sessões no período que trabalharam este grupo como grupo primário de algum exercício. */
  frequency: number
  /**
   * Fatia (0-100) do total de SÉRIES do período que este grupo representa —
   * métrica primária escolhida para o percentual de participação (não volume
   * em kg), porque séries é a unidade mais direta de "estímulo" e é a mesma
   * unidade usada pelos limiares existentes de `buildMuscleGroupLoads`
   * (`minimumWeeklySetsForRepresentation`/`highWeeklySetsThreshold`). Zero
   * quando não há nenhuma série no período (nunca divide por zero).
   */
  participationPercent: number
}

export interface MuscleBalanceReport {
  /**
   * Grupos negligenciados: status `'underrepresented'` (poucas séries) ou
   * `'not_planned'` (nenhuma sessão) segundo `buildMuscleGroupLoads` — os
   * MESMOS limiares já usados no resto do app (`minimumWeeklySetsForRepresentation`
   * em `DEFAULT_TRAINING_LOAD_CONFIG`), em vez de inventar um segundo limiar
   * paralelo que poderia divergir.
   */
  neglectedGroups: MuscleGroup[]
  /**
   * Grupos excessivos: participação (em séries) mais que o DOBRO da fatia
   * proporcional esperada se os 7 grupos fossem perfeitamente equilibrados
   * (100% / 7 ≈ 14.3%, logo limiar ≈ 28.6%). Threshold relativo (não um
   * número absoluto de séries) para funcionar igualmente bem em períodos
   * curtos ('7d') e longos ('1y').
   */
  excessiveGroups: MuscleGroup[]
  pushPullRatio: { push: number; pull: number; ratio: number | null }
  upperLowerRatio: { upper: number; lower: number; ratio: number | null }
  period: AnalyticsPeriod
}

// ─── Mapeamentos push/pull e superior/inferior ──────────────────────────────
//
// Classificação genuinamente nova (não existe em nenhum motor existente) —
// decisões de domínio documentadas explicitamente, não derivadas de código
// já existente.

/** Empurram carga para longe do corpo (padrão de empurrar). */
const PUSH_GROUPS: MuscleGroup[] = ['peito', 'ombros', 'triceps']
/** Puxam carga em direção ao corpo (padrão de puxar). */
const PULL_GROUPS: MuscleGroup[] = ['costas', 'biceps']
// 'pernas' (padrão de membro inferior) e 'core' (tronco/estabilização) não se
// encaixam com clareza em nenhum dos dois lados de empurrar/puxar de membro
// superior — deliberadamente EXCLUÍDOS da razão push/pull, em vez de forçados
// para um lado.

/** Grupos de membro superior. */
const UPPER_GROUPS: MuscleGroup[] = ['peito', 'costas', 'ombros', 'biceps', 'triceps']
/** Grupos de membro inferior. */
const LOWER_GROUPS: MuscleGroup[] = ['pernas']
// 'core' é tronco, não membro superior nem inferior — EXCLUÍDO da razão
// superior/inferior também, pelo mesmo raciocínio (a spec pede uma razão de
// 2 lados, "superiores/inferiores", não uma divisão de 3 vias).

/** Fatia proporcional esperada por grupo se os 7 fossem perfeitamente equilibrados. */
const EVEN_SHARE_PERCENT = 100 / ALL_MUSCLE_GROUPS.length
const EXCESSIVE_SHARE_MULTIPLIER = 2

function buildSessionSummaries(
  workouts: CompletedWorkout[],
  allExercises: ReturnType<typeof getAllExercises>
): CompletedSessionSummary[] {
  return workouts.map((w) => ({
    id: w.id,
    workoutId: w.workoutId,
    workoutName: w.workoutName,
    completedAt: w.completedAt,
    volumeKg: sessionVolumeKg(w),
    totalSets: sessionTotalSets(w),
    totalReps: sessionTotalReps(w),
    primaryMuscleGroups: getSessionPrimaryMuscleGroups(w, allExercises),
    // wasAdjusted/readinessLevel/isFreeSession não são consumidos por
    // `buildMuscleGroupLoads` — preenchidos com valores neutros só para
    // satisfazer o shape de `CompletedSessionSummary`.
    wasAdjusted: false,
    readinessLevel: null,
    isFreeSession: false,
  }))
}

/**
 * Distribuição de séries/volume/frequência por grupo muscular num período.
 * Constrói sobre `buildMuscleGroupLoads` (`training-load.ts`) — não
 * recalcula atribuição de séries por grupo.
 */
export function computeMuscleGroupDistribution(
  period: AnalyticsPeriod,
  now: Date = new Date()
): MuscleGroupDistributionEntry[] {
  const range = resolvePeriodRange(period, now)
  const history = getWorkoutHistory()
  const workoutsInPeriod = filterByDateRange(history, range, (w) => w.completedAt)
  const allExercises = getAllExercises()

  const sessions = buildSessionSummaries(workoutsInPeriod, allExercises)
  const loads = buildMuscleGroupLoads(sessions, allExercises, workoutsInPeriod, DEFAULT_TRAINING_LOAD_CONFIG)

  const totalSets = loads.reduce((sum, l) => sum + l.totalSets, 0)

  return loads.map((load) => ({
    muscleGroup: load.muscleGroup,
    label: MUSCLE_GROUP_LABELS[load.muscleGroup],
    sets: load.totalSets,
    volumeKg: load.totalVolumeKg,
    frequency: load.completedSessions,
    participationPercent: totalSets > 0 ? (load.totalSets / totalSets) * 100 : 0,
  }))
}

function sumSets(distribution: MuscleGroupDistributionEntry[], groups: MuscleGroup[]): number {
  return distribution
    .filter((d) => groups.includes(d.muscleGroup))
    .reduce((sum, d) => sum + d.sets, 0)
}

function computeRatio(a: number, b: number): number | null {
  return b > 0 ? a / b : null
}

/**
 * Relatório de desequilíbrio muscular para um período: grupos negligenciados/
 * excessivos e razões push/pull e superior/inferior (em séries — mesma
 * métrica primária de `computeMuscleGroupDistribution`).
 */
export function identifyImbalances(period: AnalyticsPeriod, now: Date = new Date()): MuscleBalanceReport {
  const distribution = computeMuscleGroupDistribution(period, now)

  // Reaproveita a MESMA lógica de status de `buildMuscleGroupLoads`: zero
  // séries → 'not_planned'; abaixo do limiar de representação semanal padrão
  // → 'underrepresented'. Expressa aqui em termos de `sets` (já disponível na
  // distribuição) para não precisar re-expor o status interno de
  // `MuscleGroupWeeklyLoad`.
  const neglectedGroups = distribution
    .filter((d) => d.sets < DEFAULT_TRAINING_LOAD_CONFIG.minimumWeeklySetsForRepresentation)
    .map((d) => d.muscleGroup)

  const excessiveThreshold = EVEN_SHARE_PERCENT * EXCESSIVE_SHARE_MULTIPLIER
  const excessiveGroups = distribution
    .filter((d) => d.participationPercent > excessiveThreshold)
    .map((d) => d.muscleGroup)

  const pushSets = sumSets(distribution, PUSH_GROUPS)
  const pullSets = sumSets(distribution, PULL_GROUPS)
  const upperSets = sumSets(distribution, UPPER_GROUPS)
  const lowerSets = sumSets(distribution, LOWER_GROUPS)

  return {
    neglectedGroups,
    excessiveGroups,
    pushPullRatio: { push: pushSets, pull: pullSets, ratio: computeRatio(pushSets, pullSets) },
    upperLowerRatio: { upper: upperSets, lower: lowerSets, ratio: computeRatio(upperSets, lowerSets) },
    period,
  }
}
