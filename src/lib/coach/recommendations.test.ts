import { describe, it, expect } from 'vitest'
import { assembleRecommendations } from './recommendations'
import { buildBaseSignals } from './test-fixtures'
import type { CoachDecision } from './decisions'

const NOW = new Date('2026-07-25T12:00:00.000Z')

function signalsWithHighAdherence() {
  return buildBaseSignals({
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
}

describe('assembleRecommendations — empty data', () => {
  it('returns an empty list for fully neutral signals', () => {
    expect(assembleRecommendations(buildBaseSignals(), NOW, [])).toEqual([])
  })
})

describe('assembleRecommendations — decision status resolution', () => {
  it('defaults to "nova" with no decision on record', () => {
    const recs = assembleRecommendations(signalsWithHighAdherence(), NOW, [])
    expect(recs).toHaveLength(1)
    expect(recs[0].status).toBe('nova')
  })

  it('reflects a "visualizada"/"ignorada" decision as-is', () => {
    const signals = signalsWithHighAdherence()
    const [{ id }] = assembleRecommendations(signals, NOW, [])
    const decisions: CoachDecision[] = [{ recommendationId: id, status: 'ignorada', decidedAt: NOW.toISOString() }]
    const recs = assembleRecommendations(signals, NOW, decisions)
    expect(recs[0].status).toBe('ignorada')
  })

  it('keeps an "aceita" decision active within the expiry window', () => {
    const signals = signalsWithHighAdherence()
    const [{ id }] = assembleRecommendations(signals, NOW, [])
    const decidedAt = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const decisions: CoachDecision[] = [{ recommendationId: id, status: 'aceita', decidedAt }]
    const recs = assembleRecommendations(signals, NOW, decisions)
    expect(recs[0].status).toBe('aceita')
  })

  it('derives "expirada" for an "aceita" decision past the 14-day window', () => {
    const signals = signalsWithHighAdherence()
    const [{ id }] = assembleRecommendations(signals, NOW, [])
    const decidedAt = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
    const decisions: CoachDecision[] = [{ recommendationId: id, status: 'aceita', decidedAt }]
    const recs = assembleRecommendations(signals, NOW, decisions)
    expect(recs[0].status).toBe('expirada')
  })

  it('never expires a "visualizada" or "ignorada" decision, however old', () => {
    const signals = signalsWithHighAdherence()
    const [{ id }] = assembleRecommendations(signals, NOW, [])
    const decidedAt = new Date(NOW.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString()
    const decisions: CoachDecision[] = [{ recommendationId: id, status: 'ignorada', decidedAt }]
    const recs = assembleRecommendations(signals, NOW, decisions)
    expect(recs[0].status).toBe('ignorada')
  })
})

describe('assembleRecommendations — sorting and ids', () => {
  it('sorts recommendations high -> medium -> low priority', () => {
    const trend = {
      metric: 'load' as const,
      direction: 'stable' as const,
      sampleSize: 8,
      explanation: 'estável',
    }
    const signals = buildBaseSignals({
      consistency: signalsWithHighAdherence().consistency, // low weight (0.2) -> low priority
      performance: {
        evolution: [],
        topEvolving: [],
        stagnant: [],
        stagnationDetails: [{ exerciseId: 'ex-1', exerciseName: 'Supino', trend }], // weight 0.6 -> medium priority
      },
      recovery: {
        ...buildBaseSignals().recovery,
        readiness: { totalCheckIns: 6, averageEnergy: 2, averageSleep: 2, averageSoreness: 4, averageMotivation: 2, highReadinessCount: 0, moderateReadinessCount: 2, lowReadinessCount: 4 },
        loadTrend: 'increasing',
        patterns: [
          {
            id: 'fatigue:high_load_low_readiness:30d',
            category: 'fatigue',
            severity: 'attention',
            title: 'Carga em alta',
            explanation: 'x',
            evidence: ['e'],
            period: '30d',
          },
        ],
      },
    })
    const recs = assembleRecommendations(signals, NOW, [])
    const priorities = recs.map((r) => r.priority)
    const firstLowIndex = priorities.indexOf('low')
    const firstMediumIndex = priorities.indexOf('medium')
    const firstHighIndex = priorities.indexOf('high')
    expect(firstHighIndex).toBeLessThan(firstMediumIndex)
    expect(firstMediumIndex).toBeLessThan(firstLowIndex)
  })

  it('produces deterministic ids: same signals produce the same recommendation ids across calls', () => {
    const signals = signalsWithHighAdherence()
    const first = assembleRecommendations(signals, NOW, [])
    const second = assembleRecommendations(signals, NOW, [])
    expect(first.map((r) => r.id)).toEqual(second.map((r) => r.id))
  })
})
