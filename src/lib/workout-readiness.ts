import { getWorkoutHistory } from './workout-history'
import { getMuscleRecoveryStates } from './workout-recovery'
import { getAllExerciseIntelligence } from './workout-intelligence'
import { calculateVolumeKg } from './exercise-records'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import type { MuscleGroup } from './muscle-groups'
import { getAllExercises } from './custom-workouts'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessLevel = 'high' | 'moderate' | 'low' | 'insufficient_data'

export type ReadinessFactorKey =
  | 'energy'
  | 'soreness'
  | 'sleep'
  | 'motivation'
  | 'muscle_recovery'
  | 'recent_frequency'
  | 'performance_trend'
  | 'weekly_volume'

export interface ReadinessFactor {
  key: ReadinessFactorKey
  impact: 'positive' | 'neutral' | 'negative'
  label: string
  explanation: string
}

export type ReadinessAdjustmentType =
  | 'keep_plan'
  | 'avoid_progression'
  | 'reduce_weight'
  | 'reduce_sets'
  | 'increase_rest'
  | 'prioritize_technique'
  | 'consider_alternative_session'

export interface ReadinessAdjustment {
  type: ReadinessAdjustmentType
  value?: number
  label: string
  reason: string
}

export type ReadinessRecommendation =
  | 'train_normally'
  | 'train_conservatively'
  | 'reduce_intensity'
  | 'consider_recovery'
  | 'complete_check_in'

export interface WorkoutReadinessResult {
  level: ReadinessLevel
  score?: number
  confidence: 'low' | 'medium' | 'high'
  recommendation: ReadinessRecommendation
  headline: string
  explanation: string
  factors: ReadinessFactor[]
  suggestedAdjustments: ReadinessAdjustment[]
}

export type ReadinessOutcome =
  | 'above_expectation'
  | 'aligned'
  | 'below_expectation'
  | 'insufficient_data'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface ReadinessConfig {
  highThreshold: number
  moderateThreshold: number
  lowThreshold: number
  highSorenessThreshold: number
  lowEnergyThreshold: number
  lowSleepThreshold: number
  minimumHoursBetweenSimilarSessions: number
  highWeeklyFrequencyThreshold: number
  volumeSpikePercentage: number
  minSessionsForConfidence: number
  minSessionsForInsight: number
}

export const DEFAULT_READINESS_CONFIG: ReadinessConfig = {
  highThreshold: 72,
  moderateThreshold: 45,
  lowThreshold: 44,
  highSorenessThreshold: 4,
  lowEnergyThreshold: 2,
  lowSleepThreshold: 2,
  minimumHoursBetweenSimilarSessions: 48,
  highWeeklyFrequencyThreshold: 5,
  volumeSpikePercentage: 30,
  minSessionsForConfidence: 3,
  minSessionsForInsight: 5,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function ratingToScore(rating: 1 | 2 | 3 | 4 | 5): number {
  return (rating - 1) * 25
}

function invertedRatingToScore(rating: 1 | 2 | 3 | 4 | 5): number {
  return (5 - rating) * 25
}

function sessionCountLast7Days(now: Date): number {
  const history = getWorkoutHistory()
  const cutoff = now.getTime() - 7 * 86400000
  return history.filter((w) => new Date(w.completedAt).getTime() >= cutoff).length
}

function averageWeeklyVolumeKg(weeksBack = 4, now: Date = new Date()): number {
  const history = getWorkoutHistory()
  const cutoff = now.getTime() - weeksBack * 7 * 86400000
  const recent = history.filter((w) => new Date(w.completedAt).getTime() >= cutoff)
  if (recent.length === 0) return 0
  const total = recent.reduce(
    (sum, w) => sum + w.exercises.reduce((s, ex) => s + calculateVolumeKg(ex.sets), 0),
    0
  )
  return total / weeksBack
}

function currentWeekVolumeKg(now: Date = new Date()): number {
  const history = getWorkoutHistory()
  const cutoff = now.getTime() - 7 * 86400000
  return history
    .filter((w) => new Date(w.completedAt).getTime() >= cutoff)
    .reduce(
      (sum, w) => sum + w.exercises.reduce((s, ex) => s + calculateVolumeKg(ex.sets), 0),
      0
    )
}

function worstMuscleRecoveryPercent(targetGroups: MuscleGroup[], now: Date = new Date()): number {
  const allExercises = getAllExercises()
  const states = getMuscleRecoveryStates(getWorkoutHistory(), allExercises, now)
  if (targetGroups.length === 0) return 100
  const percents = targetGroups.map((g) => states[g]?.recoveryPercent ?? 100)
  return Math.min(...percents)
}

function dominantExerciseStatus(
  workoutExerciseIds: string[]
): 'improving' | 'stable' | 'stagnant' | 'regressing' | 'insufficient_data' {
  const all = getAllExerciseIntelligence()
  const relevant = workoutExerciseIds.length > 0
    ? all.filter((e) => workoutExerciseIds.includes(e.exerciseId))
    : all

  if (relevant.length === 0) return 'insufficient_data'

  const counts = {
    regressing: 0,
    stagnant: 0,
    stable: 0,
    improving: 0,
    insufficient_data: 0,
  }
  for (const e of relevant) {
    counts[e.status]++
  }
  if (counts.regressing > 0) return 'regressing'
  if (counts.stagnant > counts.improving) return 'stagnant'
  if (counts.improving > 0) return 'improving'
  return 'stable'
}

// ─── Score calculation ────────────────────────────────────────────────────────

interface RawScores {
  subjectiveScore: number | null
  muscleRecoveryScore: number
  frequencyScore: number
  trendScore: number
  volumeScore: number
}

function computeRawScores(
  checkIn: WorkoutReadinessCheckIn | null,
  targetGroups: MuscleGroup[],
  workoutExerciseIds: string[],
  config: ReadinessConfig,
  now: Date
): RawScores {
  let subjectiveScore: number | null = null
  if (checkIn) {
    const energyScore = ratingToScore(checkIn.energy)
    const sorenessScore = invertedRatingToScore(checkIn.soreness)
    const sleepScore = ratingToScore(checkIn.sleepQuality)
    const motivationScore = ratingToScore(checkIn.motivation)
    subjectiveScore = (energyScore + sorenessScore + sleepScore + motivationScore) / 4
  }

  const recovery = worstMuscleRecoveryPercent(targetGroups, now)
  const muscleRecoveryScore = recovery

  const sessions7d = sessionCountLast7Days(now)
  let frequencyScore: number
  if (sessions7d === 0) frequencyScore = 90
  else if (sessions7d <= 2) frequencyScore = 80
  else if (sessions7d <= 4) frequencyScore = 65
  else frequencyScore = clamp(100 - (sessions7d - config.highWeeklyFrequencyThreshold) * 15, 20, 50)

  const trend = dominantExerciseStatus(workoutExerciseIds)
  const trendScore =
    trend === 'improving' ? 90
    : trend === 'stable' ? 75
    : trend === 'stagnant' ? 55
    : trend === 'regressing' ? 30
    : 65 // insufficient_data

  const avgVolume = averageWeeklyVolumeKg(4, now)
  const curVolume = currentWeekVolumeKg(now)
  let volumeScore = 80
  if (avgVolume > 0) {
    const pctAbove = ((curVolume - avgVolume) / avgVolume) * 100
    if (pctAbove > config.volumeSpikePercentage) {
      volumeScore = clamp(80 - (pctAbove - config.volumeSpikePercentage) * 0.8, 20, 80)
    }
  }

  return { subjectiveScore, muscleRecoveryScore, frequencyScore, trendScore, volumeScore }
}

function computeFinalScore(scores: RawScores): number {
  const objective =
    scores.muscleRecoveryScore * 0.4 +
    scores.frequencyScore * 0.25 +
    scores.trendScore * 0.25 +
    scores.volumeScore * 0.1

  if (scores.subjectiveScore === null) return clamp(objective, 0, 100)

  // With check-in: 50% subjective, 50% objective
  return clamp(scores.subjectiveScore * 0.5 + objective * 0.5, 0, 100)
}

// ─── Factor generation ────────────────────────────────────────────────────────

function buildFactors(
  checkIn: WorkoutReadinessCheckIn | null,
  scores: RawScores,
  config: ReadinessConfig
): ReadinessFactor[] {
  const factors: ReadinessFactor[] = []

  if (checkIn) {
    factors.push({
      key: 'energy',
      impact: checkIn.energy >= 3 ? 'positive' : checkIn.energy <= config.lowEnergyThreshold ? 'negative' : 'neutral',
      label: 'Energia',
      explanation:
        checkIn.energy >= 4 ? 'Energia boa para um treino completo.'
        : checkIn.energy === 3 ? 'Energia dentro do normal.'
        : 'Energia baixa — atenção à intensidade.',
    })
    factors.push({
      key: 'soreness',
      impact: checkIn.soreness <= 2 ? 'positive' : checkIn.soreness >= config.highSorenessThreshold ? 'negative' : 'neutral',
      label: 'Dor muscular',
      explanation:
        checkIn.soreness <= 2 ? 'Pouca dor muscular residual.'
        : checkIn.soreness === 3 ? 'Dor moderada — observe a resposta nas primeiras séries.'
        : 'Dor muscular alta — evite forçar grupos afetados.',
    })
    factors.push({
      key: 'sleep',
      impact: checkIn.sleepQuality >= 3 ? 'positive' : checkIn.sleepQuality <= config.lowSleepThreshold ? 'negative' : 'neutral',
      label: 'Sono',
      explanation:
        checkIn.sleepQuality >= 4 ? 'Sono reparador.'
        : checkIn.sleepQuality === 3 ? 'Sono razoável.'
        : 'Sono insuficiente — recuperação pode estar comprometida.',
    })
    factors.push({
      key: 'motivation',
      impact: checkIn.motivation >= 3 ? 'positive' : 'negative',
      label: 'Motivação',
      explanation:
        checkIn.motivation >= 4 ? 'Alta motivação.'
        : checkIn.motivation === 3 ? 'Motivação normal.'
        : 'Motivação baixa — tente focar em metas de processo.',
    })
  }

  const recoveryImpact: ReadinessFactor['impact'] =
    scores.muscleRecoveryScore >= 80 ? 'positive'
    : scores.muscleRecoveryScore >= 50 ? 'neutral'
    : 'negative'
  factors.push({
    key: 'muscle_recovery',
    impact: recoveryImpact,
    label: 'Recuperação muscular',
    explanation:
      scores.muscleRecoveryScore >= 80 ? 'Grupos musculares bem recuperados.'
      : scores.muscleRecoveryScore >= 50 ? 'Recuperação parcial — monitore a resposta.'
      : 'Músculos ainda em recuperação — evite aumentar carga.',
  })

  const freqImpact: ReadinessFactor['impact'] =
    scores.frequencyScore >= 75 ? 'positive'
    : scores.frequencyScore >= 55 ? 'neutral'
    : 'negative'
  factors.push({
    key: 'recent_frequency',
    impact: freqImpact,
    label: 'Frequência recente',
    explanation:
      scores.frequencyScore >= 75 ? 'Frequência de treinos equilibrada esta semana.'
      : scores.frequencyScore >= 55 ? 'Frequência um pouco elevada — descanse quando necessário.'
      : 'Muitos treinos recentes — cuidado com acúmulo de fadiga.',
  })

  const trendImpact: ReadinessFactor['impact'] =
    scores.trendScore >= 75 ? 'positive'
    : scores.trendScore >= 50 ? 'neutral'
    : 'negative'
  factors.push({
    key: 'performance_trend',
    impact: trendImpact,
    label: 'Tendência de desempenho',
    explanation:
      scores.trendScore >= 80 ? 'Exercícios em progressão.'
      : scores.trendScore >= 60 ? 'Desempenho estável.'
      : 'Queda recente de desempenho — consolide antes de progredir.',
  })

  if (scores.volumeScore < 75) {
    factors.push({
      key: 'weekly_volume',
      impact: 'negative',
      label: 'Volume semanal',
      explanation: 'Volume desta semana acima da média — evite novos aumentos hoje.',
    })
  } else {
    factors.push({
      key: 'weekly_volume',
      impact: 'positive',
      label: 'Volume semanal',
      explanation: 'Volume semanal dentro da faixa habitual.',
    })
  }

  return factors
}

// ─── Adjustment generation ────────────────────────────────────────────────────

function buildAdjustments(
  level: ReadinessLevel,
  checkIn: WorkoutReadinessCheckIn | null,
  scores: RawScores,
  config: ReadinessConfig
): ReadinessAdjustment[] {
  const adjustments: ReadinessAdjustment[] = []

  if (level === 'high') {
    adjustments.push({
      type: 'keep_plan',
      label: 'Siga o plano',
      reason: 'Boa prontidão — mantenha a meta de progressão.',
    })
    return adjustments
  }

  if (level === 'low' || level === 'moderate') {
    if (checkIn && checkIn.soreness >= config.highSorenessThreshold) {
      adjustments.push({
        type: 'prioritize_technique',
        label: 'Priorize a técnica',
        reason: 'Dor muscular alta — foque em execução limpa antes de aumentar carga.',
      })
    }

    if (scores.muscleRecoveryScore < 60) {
      adjustments.push({
        type: 'avoid_progression',
        label: 'Não force progressão',
        reason: 'Grupos musculares ainda em recuperação.',
      })
    }

    if (level === 'low') {
      if (checkIn && (checkIn.energy <= config.lowEnergyThreshold || checkIn.sleepQuality <= config.lowSleepThreshold)) {
        adjustments.push({
          type: 'reduce_sets',
          label: 'Reduza uma série por exercício',
          reason: 'Energia ou sono baixo — volume menor ajuda na recuperação.',
        })
      }
      adjustments.push({
        type: 'increase_rest',
        label: 'Aumente o descanso entre séries',
        reason: 'Mais tempo de recuperação entre séries reduz o risco de queda de desempenho.',
      })
    }

    if (scores.trendScore < 50) {
      adjustments.push({
        type: 'avoid_progression',
        label: 'Evite buscar PR hoje',
        reason: 'Queda recente de desempenho — consolide a carga atual.',
      })
    }
  }

  if (adjustments.length === 0 && level === 'moderate') {
    adjustments.push({
      type: 'avoid_progression',
      label: 'Observe a primeira série',
      reason: 'Use a primeira série como referência antes de decidir sobre carga.',
    })
  }

  return adjustments.slice(0, 3)
}

// ─── Main function ─────────────────────────────────────────────────────────────

export interface ReadinessInput {
  checkIn: WorkoutReadinessCheckIn | null
  targetMuscleGroups?: MuscleGroup[]
  workoutExerciseIds?: string[]
  config?: ReadinessConfig
  now?: Date
}

export function calculateReadiness(input: ReadinessInput): WorkoutReadinessResult {
  const config = input.config ?? DEFAULT_READINESS_CONFIG
  const now = input.now ?? new Date()
  const targetGroups = input.targetMuscleGroups ?? []
  const exerciseIds = input.workoutExerciseIds ?? []

  const history = getWorkoutHistory()

  // Insufficient data: no check-in AND very little history
  if (!input.checkIn && history.length === 0) {
    return {
      level: 'insufficient_data',
      confidence: 'low',
      recommendation: 'complete_check_in',
      headline: 'Complete o check-in',
      explanation:
        'Faça o check-in rápido para avaliarmos sua prontidão com base em como você está hoje.',
      factors: [],
      suggestedAdjustments: [],
    }
  }

  const scores = computeRawScores(input.checkIn, targetGroups, exerciseIds, config, now)
  const score = computeFinalScore(scores)

  const level: ReadinessLevel =
    score >= config.highThreshold ? 'high'
    : score >= config.moderateThreshold ? 'moderate'
    : 'low'

  const confidence: WorkoutReadinessResult['confidence'] =
    input.checkIn && history.length >= config.minSessionsForConfidence
      ? 'high'
      : input.checkIn || history.length >= config.minSessionsForConfidence
        ? 'medium'
        : 'low'

  const recommendation: ReadinessRecommendation =
    level === 'high' ? 'train_normally'
    : level === 'moderate' ? 'train_conservatively'
    : 'reduce_intensity'

  let headline: string
  let explanation: string

  if (level === 'high') {
    headline = 'Pronto para evoluir'
    explanation =
      'Boa recuperação, energia e desempenho recente estável. Você pode seguir o plano e considerar a meta de progressão sugerida.'
  } else if (level === 'moderate') {
    headline = 'Treine com atenção'
    explanation =
      'Sua recuperação parece razoável, mas alguns fatores sugerem cautela. Comece normalmente e reavalie após as primeiras séries.'
  } else {
    headline = 'Hoje pode ser um dia mais leve'
    explanation =
      'Energia baixa, recuperação incompleta ou queda recente de desempenho. Considere reduzir a intensidade — sem necessidade de cancelar o treino.'
  }

  const factors = buildFactors(input.checkIn, scores, config)
  const adjustments = buildAdjustments(level, input.checkIn, scores, config)

  return {
    level,
    score: Math.round(score),
    confidence,
    recommendation,
    headline,
    explanation,
    factors,
    suggestedAdjustments: adjustments,
  }
}

// ─── Progression context ──────────────────────────────────────────────────────

export interface ProgressionContext {
  readinessLevel: ReadinessLevel
  contextLabel: string
  contextNote: string
}

export function getProgressionContext(level: ReadinessLevel): ProgressionContext {
  if (level === 'high') {
    return {
      readinessLevel: level,
      contextLabel: 'Meta liberada para tentativa',
      contextNote: 'Boa prontidão — condições favoráveis para tentar a progressão.',
    }
  }
  if (level === 'moderate') {
    return {
      readinessLevel: level,
      contextLabel: 'Meta disponível com cautela',
      contextNote:
        'Consolide a carga atual caso a primeira série esteja pesada antes de tentar progredir.',
    }
  }
  if (level === 'low') {
    return {
      readinessLevel: level,
      contextLabel: 'Hoje não é necessário perseguir essa meta',
      contextNote:
        'Prontidão baixa — foque em completar o treino com qualidade sem forçar progressão.',
    }
  }
  return {
    readinessLevel: level,
    contextLabel: 'Complete o check-in',
    contextNote: 'Faça o check-in para receber orientação sobre a meta de hoje.',
  }
}

// ─── Session outcome ──────────────────────────────────────────────────────────

export interface SessionOutcomeInput {
  readinessLevel: ReadinessLevel
  actualVolume: number
  expectedVolume: number
  regressingCount: number
  improvingCount: number
}

export function calculateSessionOutcome(input: SessionOutcomeInput): ReadinessOutcome {
  if (input.readinessLevel === 'insufficient_data') return 'insufficient_data'

  const volRatio = input.expectedVolume > 0 ? input.actualVolume / input.expectedVolume : 1

  if (input.readinessLevel === 'low') {
    if (volRatio >= 0.95 && input.regressingCount === 0) return 'above_expectation'
    if (volRatio >= 0.75) return 'aligned'
    return 'below_expectation'
  }

  if (input.regressingCount > input.improvingCount && volRatio < 0.85) return 'below_expectation'
  if (input.improvingCount > 0 && volRatio >= 1.0) return 'above_expectation'
  return 'aligned'
}

export function formatOutcome(outcome: ReadinessOutcome): string {
  switch (outcome) {
    case 'above_expectation': return 'Você treinou acima da expectativa de hoje.'
    case 'aligned': return 'A sessão ficou alinhada com sua prontidão.'
    case 'below_expectation': return 'Seu desempenho ficou abaixo do padrão recente. Observe como você se sente na próxima sessão.'
    case 'insufficient_data': return ''
  }
}

// ─── Readiness stats ──────────────────────────────────────────────────────────

export interface ReadinessStats {
  totalCheckIns: number
  averageEnergy: number
  averageSleep: number
  averageSoreness: number
  averageMotivation: number
  highReadinessCount: number
  moderateReadinessCount: number
  lowReadinessCount: number
}

export function computeReadinessStats(
  checkIns: WorkoutReadinessCheckIn[]
): ReadinessStats {
  if (checkIns.length === 0) {
    return {
      totalCheckIns: 0,
      averageEnergy: 0,
      averageSleep: 0,
      averageSoreness: 0,
      averageMotivation: 0,
      highReadinessCount: 0,
      moderateReadinessCount: 0,
      lowReadinessCount: 0,
    }
  }
  const n = checkIns.length
  const sumE = checkIns.reduce((s, c) => s + c.energy, 0)
  const sumSl = checkIns.reduce((s, c) => s + c.sleepQuality, 0)
  const sumSo = checkIns.reduce((s, c) => s + c.soreness, 0)
  const sumM = checkIns.reduce((s, c) => s + c.motivation, 0)

  let high = 0, moderate = 0, low = 0
  for (const c of checkIns) {
    const result = calculateReadiness({ checkIn: c })
    if (result.level === 'high') high++
    else if (result.level === 'moderate') moderate++
    else if (result.level === 'low') low++
  }

  return {
    totalCheckIns: n,
    averageEnergy: parseFloat((sumE / n).toFixed(1)),
    averageSleep: parseFloat((sumSl / n).toFixed(1)),
    averageSoreness: parseFloat((sumSo / n).toFixed(1)),
    averageMotivation: parseFloat((sumM / n).toFixed(1)),
    highReadinessCount: high,
    moderateReadinessCount: moderate,
    lowReadinessCount: low,
  }
}
