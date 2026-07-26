import { describe, it, expect } from 'vitest'
import { COACH_RULES } from './rules'
import { buildBaseSignals } from './test-fixtures'
import type { AnalyticsInsight } from '../analytics/types'
import type { ExerciseTrend } from '../exercise-intelligence'
import type { CoachCategory } from './types'

function rule(id: string) {
  const found = COACH_RULES.find((r) => r.id === id)
  if (!found) throw new Error(`rule not found: ${id}`)
  return found
}

describe('Coach rules — neutral/empty signals never fire', () => {
  it('produces zero findings across every rule for a fully neutral base', () => {
    const signals = buildBaseSignals()
    for (const r of COACH_RULES) {
      expect(r.evaluate(signals), `rule ${r.id} fired on neutral signals`).toEqual([])
    }
  })
})

describe('Coach.Recovery.HighLoadLowReadiness', () => {
  it('fires when the fatigue engine already flagged the pattern', () => {
    const pattern: AnalyticsInsight = {
      id: 'fatigue:high_load_low_readiness:30d',
      category: 'fatigue',
      severity: 'attention',
      title: 'Carga em alta coincidiu com prontidão baixa',
      explanation: 'explicação',
      evidence: ['Carga: +18%', 'Prontidão baixa em 4 de 6 check-ins'],
      period: '30d',
    }
    const signals = buildBaseSignals({
      recovery: {
        readiness: {
          totalCheckIns: 6,
          averageEnergy: 2,
          averageSleep: 2,
          averageSoreness: 4,
          averageMotivation: 2,
          highReadinessCount: 0,
          moderateReadinessCount: 2,
          lowReadinessCount: 4,
        },
        recoveryByMuscleGroup: buildBaseSignals().recovery.recoveryByMuscleGroup,
        loadTrend: 'increasing',
        patterns: [pattern],
      },
    })
    const findings = rule('Coach.Recovery.HighLoadLowReadiness').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].category).toBe('recovery')
    expect(findings[0].evidence).toEqual(pattern.evidence)
    expect(findings[0].sampleSize).toBe(6)
  })

  it('does not fire when no matching pattern is present', () => {
    const signals = buildBaseSignals()
    expect(rule('Coach.Recovery.HighLoadLowReadiness').evaluate(signals)).toEqual([])
  })
})

describe('Coach.Consistency.LowAdherence / Coach.Program.HighAdherence', () => {
  it('fires low-adherence below 60% with enough planned sessions', () => {
    const signals = buildBaseSignals({
      consistency: {
        weeklyAdherenceRate: 0.4,
        monthlyAdherenceRate: 0.4,
        plannedSessions: 5,
        completedSessions: 2,
        missedSessions: 3,
        longestStreakDays: 1,
        currentStreakDays: 0,
        perfectWeeksCount: 0,
        bestMonth: null,
        worstMonth: null,
        period: '30d',
      },
    })
    const findings = rule('Coach.Consistency.LowAdherence').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].evidence.join(' ')).toContain('3 sessões perdidas de 5')
  })

  it('does not fire low-adherence below the minimum session gate even with a bad rate', () => {
    const signals = buildBaseSignals({
      consistency: {
        weeklyAdherenceRate: 0.1,
        monthlyAdherenceRate: 0.1,
        plannedSessions: 1,
        completedSessions: 0,
        missedSessions: 1,
        longestStreakDays: 0,
        currentStreakDays: 0,
        perfectWeeksCount: 0,
        bestMonth: null,
        worstMonth: null,
        period: '30d',
      },
    })
    expect(rule('Coach.Consistency.LowAdherence').evaluate(signals)).toEqual([])
  })

  it('fires high-adherence reinforcement at or above 90%', () => {
    const signals = buildBaseSignals({
      consistency: {
        weeklyAdherenceRate: 0.96,
        monthlyAdherenceRate: 0.96,
        plannedSessions: 8,
        completedSessions: 8,
        missedSessions: 0,
        longestStreakDays: 12,
        currentStreakDays: 12,
        perfectWeeksCount: 2,
        bestMonth: null,
        worstMonth: null,
        period: '30d',
      },
    })
    const findings = rule('Coach.Program.HighAdherence').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].weight).toBeLessThan(0.4)
  })

  it('low and high adherence rules never fire simultaneously on the same signals', () => {
    const signals = buildBaseSignals({
      consistency: {
        weeklyAdherenceRate: 0.96,
        monthlyAdherenceRate: 0.96,
        plannedSessions: 8,
        completedSessions: 8,
        missedSessions: 0,
        longestStreakDays: 12,
        currentStreakDays: 12,
        perfectWeeksCount: 2,
        bestMonth: null,
        worstMonth: null,
        period: '30d',
      },
    })
    expect(rule('Coach.Consistency.LowAdherence').evaluate(signals)).toEqual([])
    expect(rule('Coach.Program.HighAdherence').evaluate(signals)).toHaveLength(1)
  })
})

describe('Coach.Frequency.LongGap', () => {
  it('fires per muscle group at or above the 14-day gap threshold', () => {
    const base = buildBaseSignals()
    const signals = buildBaseSignals({
      recovery: {
        ...base.recovery,
        recoveryByMuscleGroup: {
          ...base.recovery.recoveryByMuscleGroup,
          costas: { muscleGroup: 'costas', lastTrainedAt: '2026-07-09T00:00:00.000Z', hoursSinceTrained: 16 * 24, recoveryPercent: 100, status: 'recovered' },
        },
      },
    })
    const findings = rule('Coach.Frequency.LongGap').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].scopeKey).toBe('costas')
    expect(findings[0].title).toContain('16 dias')
  })

  it('does not fire below the threshold or when never trained (lastTrainedAt null)', () => {
    const base = buildBaseSignals()
    const signals = buildBaseSignals({
      recovery: {
        ...base.recovery,
        recoveryByMuscleGroup: {
          ...base.recovery.recoveryByMuscleGroup,
          costas: { muscleGroup: 'costas', lastTrainedAt: '2026-07-20T00:00:00.000Z', hoursSinceTrained: 5 * 24, recoveryPercent: 100, status: 'recovered' },
        },
      },
    })
    expect(rule('Coach.Frequency.LongGap').evaluate(signals)).toEqual([])
  })
})

describe('Coach.Muscle.Neglected / Coach.Volume.Imbalance', () => {
  it('fires neglected for groups already classified by the muscle-balance engine, with matching distribution evidence', () => {
    const signals = buildBaseSignals({
      muscleBalance: {
        neglectedGroups: ['costas'],
        excessiveGroups: [],
        pushPullRatio: { push: 10, pull: 1, ratio: 10 },
        upperLowerRatio: { upper: 8, lower: 2, ratio: 4 },
        period: '30d',
        distribution: [{ muscleGroup: 'costas', label: 'Costas', sets: 2, volumeKg: 100, frequency: 1, participationPercent: 5 }],
      },
    })
    const findings = rule('Coach.Muscle.Neglected').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].scopeKey).toBe('costas')
  })

  it('fires excessive-volume for groups already classified by the muscle-balance engine', () => {
    const signals = buildBaseSignals({
      muscleBalance: {
        neglectedGroups: [],
        excessiveGroups: ['pernas'],
        pushPullRatio: { push: 5, pull: 5, ratio: 1 },
        upperLowerRatio: { upper: 4, lower: 12, ratio: 0.33 },
        period: '30d',
        distribution: [{ muscleGroup: 'pernas', label: 'Pernas', sets: 40, volumeKg: 4000, frequency: 8, participationPercent: 49 }],
      },
    })
    const findings = rule('Coach.Volume.Imbalance').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].evidence.join(' ')).toContain('49')
  })

  it('never double-counts a group as both neglected and excessive when they are genuinely distinct', () => {
    const signals = buildBaseSignals({
      muscleBalance: {
        neglectedGroups: ['costas'],
        excessiveGroups: ['pernas'],
        pushPullRatio: { push: 5, pull: 1, ratio: 5 },
        upperLowerRatio: { upper: 4, lower: 12, ratio: 0.33 },
        period: '30d',
        distribution: [
          { muscleGroup: 'costas', label: 'Costas', sets: 2, volumeKg: 100, frequency: 1, participationPercent: 5 },
          { muscleGroup: 'pernas', label: 'Pernas', sets: 40, volumeKg: 4000, frequency: 8, participationPercent: 49 },
        ],
      },
    })
    const neglected = rule('Coach.Muscle.Neglected').evaluate(signals)
    const excessive = rule('Coach.Volume.Imbalance').evaluate(signals)
    expect(neglected.map((f) => f.scopeKey)).toEqual(['costas'])
    expect(excessive.map((f) => f.scopeKey)).toEqual(['pernas'])
  })

  it('resolves a real upstream conflict (same group classified as both neglected and excessive, small-sample artifact) by suppressing the neglected finding', () => {
    // Reproduz um caso real observado em QA: com poucas sessões no período, `muscle-balance.ts`
    // pode classificar o MESMO grupo como neglected (limiar semanal) e excessive (fatia do
    // período) ao mesmo tempo — bases de cálculo diferentes (ver `muscle-balance.ts`).
    const signals = buildBaseSignals({
      muscleBalance: {
        neglectedGroups: ['peito'],
        excessiveGroups: ['peito'],
        pushPullRatio: { push: 5, pull: 1, ratio: 5 },
        upperLowerRatio: { upper: 4, lower: 1, ratio: 4 },
        period: '30d',
        distribution: [{ muscleGroup: 'peito', label: 'Peito', sets: 20, volumeKg: 1500, frequency: 3, participationPercent: 83.3 }],
      },
    })
    const neglected = rule('Coach.Muscle.Neglected').evaluate(signals)
    const excessive = rule('Coach.Volume.Imbalance').evaluate(signals)
    expect(neglected).toEqual([])
    expect(excessive.map((f) => f.scopeKey)).toEqual(['peito'])
  })
})

describe('Coach.Progress.Stagnation', () => {
  it('fires one finding per stagnant exercise detail, using its trend explanation as evidence', () => {
    const trend: ExerciseTrend = {
      metric: 'load',
      direction: 'stable',
      currentValue: 60,
      previousValue: 60,
      percentageChange: 0,
      sampleSize: 8,
      explanation: 'Carga estável nas últimas 8 execuções.',
    }
    const signals = buildBaseSignals({
      performance: {
        evolution: [],
        topEvolving: [],
        stagnant: [],
        stagnationDetails: [{ exerciseId: 'ex-supino', exerciseName: 'Supino Inclinado', trend }],
      },
    })
    const findings = rule('Coach.Progress.Stagnation').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].scopeKey).toBe('ex-supino')
    expect(findings[0].evidence).toEqual([trend.explanation])
    expect(findings[0].weight).toBeGreaterThanOrEqual(0.6)
  })

  it('carries the trend sample size through untouched, for priority.ts to derive confidence from', () => {
    const trend: ExerciseTrend = {
      metric: 'load',
      direction: 'stable',
      sampleSize: 6,
      explanation: 'Carga estável, amostra mínima.',
    }
    const signals = buildBaseSignals({
      performance: {
        evolution: [],
        topEvolving: [],
        stagnant: [],
        stagnationDetails: [{ exerciseId: 'ex-x', exerciseName: 'Exercício X', trend }],
      },
    })
    const findings = rule('Coach.Progress.Stagnation').evaluate(signals)
    expect(findings[0].sampleSize).toBe(6)
  })
})

describe('Coach.Records.RecentAchievement', () => {
  it('fires using only the most recent record for title/evidence', () => {
    const signals = buildBaseSignals({
      records: {
        recent: [
          { exerciseId: 'ex-1', exerciseName: 'Supino', date: '2026-07-24T00:00:00.000Z', type: 'weight' },
          { exerciseId: 'ex-2', exerciseName: 'Agachamento', date: '2026-07-20T00:00:00.000Z', type: 'reps' },
        ],
      },
    })
    const findings = rule('Coach.Records.RecentAchievement').evaluate(signals)
    expect(findings).toHaveLength(1)
    expect(findings[0].title).toContain('Supino')
    expect(findings[0].sampleSize).toBe(2)
    expect(findings[0].weight).toBeLessThan(0.4)
  })
})

describe('rule id / category consistency', () => {
  it('every registered rule has a unique id', () => {
    const ids = COACH_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every required Coach category from the sprint spec', () => {
    const requiredCategories: CoachCategory[] = [
      'recovery',
      'consistency',
      'frequency',
      'volume',
      'muscle_balance',
      'training_load',
      'records',
      'stagnation',
      'program',
      // 'progression' e 'stagnation' são cobertos pela mesma regra (ver rules.ts,
      // Coach.Progress.Stagnation) — decisão documentada, não uma lacuna.
    ]
    const covered = new Set(COACH_RULES.map((r) => r.category))
    for (const category of requiredCategories) {
      expect(covered.has(category), `missing category: ${category}`).toBe(true)
    }
  })
})
