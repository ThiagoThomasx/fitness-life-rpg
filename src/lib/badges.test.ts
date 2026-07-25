import { describe, it, expect, beforeEach } from 'vitest'
import { checkAndEarnBadges, hasBadge, type BadgeCheckContext } from './badges'

beforeEach(() => {
  window.localStorage.clear()
})

function baseCtx(overrides: Partial<BadgeCheckContext> = {}): BadgeCheckContext {
  return {
    workoutCount: 0,
    totalPrs: 0,
    level: 1,
    diaryCount: 0,
    strength: 0,
    agility: 0,
    dexterity: 0,
    constitution: 0,
    vitality: 0,
    ...overrides,
  }
}

describe('checkAndEarnBadges — program adherence milestones (Sprint 21 Parte 4B)', () => {
  it('earns "Semana Perfeita" on the first perfect adherence week', () => {
    const earned = checkAndEarnBadges(baseCtx({ perfectAdherenceWeeks: 1 }))
    expect(earned.some((b) => b.id === 'badge-first-perfect-week')).toBe(true)
  })

  it('does not earn "Semana Perfeita" with zero perfect weeks', () => {
    const earned = checkAndEarnBadges(baseCtx({ perfectAdherenceWeeks: 0 }))
    expect(earned.some((b) => b.id === 'badge-first-perfect-week')).toBe(false)
  })

  it('earns "Consistência de Ferro" only once 4 high-adherence weeks accumulate', () => {
    expect(checkAndEarnBadges(baseCtx({ highAdherenceWeeks: 3 })).some((b) => b.id === 'badge-consistent-adherence')).toBe(false)
    expect(checkAndEarnBadges(baseCtx({ highAdherenceWeeks: 4 })).some((b) => b.id === 'badge-consistent-adherence')).toBe(true)
  })

  it('never grants the same badge twice (idempotent across calls)', () => {
    checkAndEarnBadges(baseCtx({ perfectAdherenceWeeks: 1 }))
    expect(hasBadge('badge-first-perfect-week')).toBe(true)
    const second = checkAndEarnBadges(baseCtx({ perfectAdherenceWeeks: 2 }))
    expect(second.some((b) => b.id === 'badge-first-perfect-week')).toBe(false)
  })
})
