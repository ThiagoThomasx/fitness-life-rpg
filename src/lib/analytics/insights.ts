// Motor de Insights — Sprint 25 Parte 4A.
//
// Segue estritamente o mesmo padrão determinístico de
// `adaptive-recommendations.ts`: regras puras, sem IA/inferência estatística,
// cada detector cita a evidência numérica exata que o disparou, ids
// determinísticos por janela (permitem dedup), e nenhum detector dispara sem
// amostra mínima — dado ausente nunca vira insight adivinhado. Diferença
// deliberada em relação a `adaptive-recommendations.ts`: aqui os textos são
// sempre OBSERVAÇÕES ("você fez X"), nunca recomendações de ação ("você
// deveria fazer Y") nem linguagem médica — mesma disciplina já aplicada aos
// `patterns` de `fatigue.ts` (Parte 3).
//
// Nenhum detector recalcula matemática de negócio: cada um compõe um motor
// já existente (Partes 1-3) e adiciona só a lógica de "N semanas
// consecutivas" / "gate de amostra" por cima.

import { getWorkoutHistory } from '../workout-history'
import { getAllExercises } from '../custom-workouts'
import { getPersonalRecordEvents } from '../personal-record-events'
import { getMuscleRecoveryStates } from '../workout-recovery'
import { ALL_MUSCLE_GROUPS } from '../training-load'
import { RECOVERY_HOURS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '../muscle-groups'
import { resolvePeriodRange, filterByDateRange, sampleConfidence, STABILITY_TOLERANCE_PERCENT } from './helpers'
import { computeConsistency } from './consistency'
import { getTopEvolvingExercises } from './performance'
import { computeMuscleGroupDistribution } from './muscle-balance'
import type { AnalyticsPeriod, AnalyticsInsight } from './types'

// ─── Limiares de gating e detecção ──────────────────────────────────────────
//
// Nenhum limiar novo é inventado sem base numa convenção já existente no
// módulo de Analytics ou em `adaptive-recommendations.ts`:
// - `SUSTAINED_INCREASE_WEEKS`/`VOLUME_INCREASE_WINDOW`: literal do exemplo
//   da spec da sprint ("quatro semanas consecutivas").
// - `NOT_TRAINED_HOURS_MULTIPLIER`: múltiplo de `RECOVERY_HOURS` (já usado
//   por `workout-recovery.ts`/`fatigue.ts`) — "muito além do tempo normal de
//   recuperação daquele grupo", não um número de dias arbitrário e novo.
// - Evolução de exercício "notável": reaproveita `STABILITY_TOLERANCE_PERCENT`
//   (`helpers.ts`, Parte 1) — a MESMA barra de "variação que não é ruído" já
//   usada por `comparePeriods` em todo o módulo.
// - Sequência de recordes "notável": reaproveita `sampleConfidence` (`helpers.ts`)
//   — dispara só quando a contagem de recordes no período atinge o nível
//   'high' já definido lá, sem um segundo número paralelo.
const SUSTAINED_INCREASE_WEEKS = 4
const VOLUME_INCREASE_WINDOW = SUSTAINED_INCREASE_WEEKS + 1
const NOT_TRAINED_HOURS_MULTIPLIER = 4

const MONTH_LABELS_PT: Record<string, string> = {
  '01': 'janeiro',
  '02': 'fevereiro',
  '03': 'março',
  '04': 'abril',
  '05': 'maio',
  '06': 'junho',
  '07': 'julho',
  '08': 'agosto',
  '09': 'setembro',
  '10': 'outubro',
  '11': 'novembro',
  '12': 'dezembro',
}

function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-')
  return `${MONTH_LABELS_PT[month] ?? month} de ${year}`
}

function dateKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

// ─── Detector: aumento sustentado de volume por grupo muscular ─────────────
//
// Constrói uma série de `VOLUME_INCREASE_WINDOW` janelas rolantes de 7 dias
// (semana atual, semana anterior, ...) chamando `computeMuscleGroupDistribution`
// repetidamente com `now` deslocado — reaproveita inteiramente a matemática de
// volume por grupo já existente (Parte 3); a única lógica nova é verificar se
// a série é estritamente crescente ao longo de `SUSTAINED_INCREASE_WEEKS`
// transições consecutivas.

function rollingWeeklyVolumes(muscleGroup: MuscleGroup, now: Date, weeks: number): number[] {
  const volumes: number[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * 86_400_000)
    const distribution = computeMuscleGroupDistribution('7d', weekEnd)
    const entry = distribution.find((d) => d.muscleGroup === muscleGroup)
    volumes.push(entry?.volumeKg ?? 0)
  }
  return volumes
}

function isStrictlyIncreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) return false
  }
  return true
}

function detectSustainedVolumeIncrease(period: AnalyticsPeriod, now: Date): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = []

  for (const muscleGroup of ALL_MUSCLE_GROUPS) {
    const volumes = rollingWeeklyVolumes(muscleGroup, now, VOLUME_INCREASE_WINDOW)
    // Exige volume real já na primeira semana da janela — descarta o caso
    // trivial "surgiu do zero", que não representa um aumento sustentado real.
    if (volumes[0] <= 0) continue
    if (!isStrictlyIncreasing(volumes)) continue

    const label = MUSCLE_GROUP_LABELS[muscleGroup]
    const roundedVolumes = volumes.map((v) => Math.round(v))

    insights.push({
      id: `insights:sustained_volume_increase:${muscleGroup}:${dateKey(now)}`,
      category: 'volume',
      severity: 'notable',
      title: `Volume de ${label.toLowerCase()} em alta por ${SUSTAINED_INCREASE_WEEKS} semanas consecutivas`,
      explanation: `Você aumentou seu volume em ${label.toLowerCase()} por ${SUSTAINED_INCREASE_WEEKS} semanas consecutivas.`,
      evidence: [`Volume semanal (kg), mais antiga → mais recente: ${roundedVolumes.join(' → ')}`],
      period,
    })
  }

  return insights
}

// ─── Detector: grupo muscular sem treinar há muito tempo ───────────────────

function detectStaleMuscleGroups(period: AnalyticsPeriod, now: Date): AnalyticsInsight[] {
  const recovery = getMuscleRecoveryStates(getWorkoutHistory(), getAllExercises(), now)
  const insights: AnalyticsInsight[] = []

  for (const muscleGroup of ALL_MUSCLE_GROUPS) {
    const state = recovery[muscleGroup]
    if (state.hoursSinceTrained === null) continue

    const threshold = RECOVERY_HOURS[muscleGroup] * NOT_TRAINED_HOURS_MULTIPLIER
    if (state.hoursSinceTrained < threshold) continue

    const daysSince = Math.floor(state.hoursSinceTrained / 24)
    const label = MUSCLE_GROUP_LABELS[muscleGroup]

    insights.push({
      id: `insights:muscle_group_stale:${muscleGroup}:${dateKey(now)}`,
      category: 'recovery',
      severity: 'attention',
      title: `${label} sem treinar há ${daysSince} dias`,
      explanation: `Você não treinou ${label.toLowerCase()} há ${daysSince} dias.`,
      evidence: [`Última sessão trabalhando ${label.toLowerCase()}: ${daysSince} dias atrás`],
      period,
    })
  }

  return insights
}

// ─── Detector: melhor mês ────────────────────────────────────────────────────

function detectBestMonth(period: AnalyticsPeriod, now: Date): AnalyticsInsight | null {
  const consistency = computeConsistency(period, now)
  if (!consistency.bestMonth || !consistency.worstMonth) return null
  // Com um único mês no período, melhor/pior mês são o mesmo — não é um
  // insight (nada para comparar), então não dispara.
  if (consistency.bestMonth.label === consistency.worstMonth.label) return null

  const monthName = formatMonthLabel(consistency.bestMonth.label)

  return {
    id: `insights:best_month:${period}:${consistency.bestMonth.label}`,
    category: 'consistency',
    severity: 'info',
    title: `Melhor mês: ${monthName}`,
    explanation: `Seu melhor mês foi ${monthName}.`,
    evidence: [`${consistency.bestMonth.completedSessions} sessões concluídas em ${monthName}`],
    period,
  }
}

// ─── Detector: evolução de exercício em destaque ────────────────────────────

function detectStandoutExerciseEvolution(period: AnalyticsPeriod): AnalyticsInsight | null {
  const [topExercise] = getTopEvolvingExercises(period, 1)
  if (!topExercise) return null
  if (Math.abs(topExercise.deltaPercent) <= STABILITY_TOLERANCE_PERCENT) return null

  const roundedDelta = Math.round(topExercise.deltaPercent)

  return {
    id: `insights:standout_exercise_evolution:${period}:${topExercise.exerciseId}`,
    category: 'performance',
    severity: 'notable',
    title: `${topExercise.exerciseName} em evolução`,
    explanation: `${topExercise.exerciseName} teve a maior evolução de carga entre seus exercícios.`,
    evidence: [
      `Carga: ${topExercise.earliestWeightKg}kg → ${topExercise.latestWeightKg}kg (${roundedDelta > 0 ? '+' : ''}${roundedDelta}%)`,
    ],
    period,
  }
}

// ─── Detector: sequência notável de recordes ────────────────────────────────

function detectNotablePrCount(period: AnalyticsPeriod, now: Date): AnalyticsInsight | null {
  const range = resolvePeriodRange(period, now)
  const recordsInPeriod = filterByDateRange(getPersonalRecordEvents(), range, (e) => e.achievedAt)
  if (sampleConfidence(recordsInPeriod.length) !== 'high') return null

  return {
    id: `insights:pr_streak:${period}:${dateKey(now)}`,
    category: 'records',
    severity: 'notable',
    title: `${recordsInPeriod.length} recordes pessoais no período`,
    explanation: `Você bateu ${recordsInPeriod.length} recordes pessoais no período selecionado.`,
    evidence: [`${recordsInPeriod.length} recordes pessoais registrados no período`],
    period,
  }
}

/**
 * Gera insights observacionais para um período, compondo inteiramente os
 * motores das Partes 1-3 (mais `personal-record-events.ts` e
 * `workout-recovery.ts`). Cada detector é independente e gated por amostra
 * mínima — a ausência de um insight nunca significa erro, só que a condição
 * não se confirmou ou não há dado suficiente ainda.
 */
export function generateInsights(period: AnalyticsPeriod, now: Date = new Date()): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = []

  insights.push(...detectSustainedVolumeIncrease(period, now))
  insights.push(...detectStaleMuscleGroups(period, now))

  const bestMonth = detectBestMonth(period, now)
  if (bestMonth) insights.push(bestMonth)

  const standoutExercise = detectStandoutExerciseEvolution(period)
  if (standoutExercise) insights.push(standoutExercise)

  const prStreak = detectNotablePrCount(period, now)
  if (prStreak) insights.push(prStreak)

  return insights
}
