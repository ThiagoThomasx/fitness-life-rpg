// Fixtures compartilhadas pelos testes do Coach — não é um arquivo de teste
// (sem sufixo `.test.ts`, ignorado pelo vitest `include`).

import type { MuscleGroup } from '../muscle-groups'
import type { MuscleRecoveryState } from '../workout-recovery'
import type { CoachSignals } from './signals'

const ALL_GROUPS: MuscleGroup[] = ['peito', 'costas', 'pernas', 'ombros', 'biceps', 'triceps', 'core']

function recoveredState(muscleGroup: MuscleGroup): MuscleRecoveryState {
  return { muscleGroup, lastTrainedAt: null, hoursSinceTrained: null, recoveryPercent: 100, status: 'recovered' }
}

function baseRecoveryByMuscleGroup(): Record<MuscleGroup, MuscleRecoveryState> {
  return Object.fromEntries(ALL_GROUPS.map((mg) => [mg, recoveredState(mg)])) as Record<MuscleGroup, MuscleRecoveryState>
}

/** Sinais "neutros": nenhuma regra deveria disparar sobre esta base sem overrides. */
export function buildBaseSignals(overrides: Partial<CoachSignals> = {}): CoachSignals {
  return {
    period: '30d',
    generatedAt: '2026-07-25T12:00:00.000Z',
    recovery: {
      readiness: {
        totalCheckIns: 0,
        averageEnergy: 0,
        averageSleep: 0,
        averageSoreness: 0,
        averageMotivation: 0,
        highReadinessCount: 0,
        moderateReadinessCount: 0,
        lowReadinessCount: 0,
      },
      recoveryByMuscleGroup: baseRecoveryByMuscleGroup(),
      loadTrend: 'insufficient_data',
      patterns: [],
    },
    consistency: {
      weeklyAdherenceRate: null,
      monthlyAdherenceRate: null,
      plannedSessions: 0,
      completedSessions: 0,
      missedSessions: 0,
      longestStreakDays: 0,
      currentStreakDays: 0,
      perfectWeeksCount: 0,
      bestMonth: null,
      worstMonth: null,
      period: '30d',
    },
    muscleBalance: {
      neglectedGroups: [],
      excessiveGroups: [],
      pushPullRatio: { push: 0, pull: 0, ratio: null },
      upperLowerRatio: { upper: 0, lower: 0, ratio: null },
      period: '30d',
      distribution: [],
    },
    performance: {
      evolution: [],
      topEvolving: [],
      stagnant: [],
      stagnationDetails: [],
    },
    trainingLoad: {
      loadTrend: 'insufficient_data',
      volumeChangePercent: null,
    },
    records: {
      recent: [],
    },
    progress: {
      period: '30d',
      sessionsCompleted: 0,
      consistencyPercent: null,
      volumeChangePercent: null,
      loadChangePercent: null,
      recordsCount: 0,
      topEvolvingExercise: null,
      leastFrequentMuscleGroup: null,
    },
    insights: [],
    ...overrides,
  }
}
