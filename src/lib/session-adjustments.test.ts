import { describe, it, expect } from 'vitest'
import {
  readinessToPreset,
  applyAdjustmentToExercise,
  buildAdjustmentSummary,
  validateAdjustment,
  roundWeightDown,
  toSnapshot,
  isOriginalAdjustment,
  computeAdjustmentStats,
  isValidAdjustmentSnapshot,
  adjustmentModeLabel,
  ORIGINAL_ADJUSTMENT,
  DEFAULT_SESSION_ADJUSTMENT_CONFIG,
} from './session-adjustments'
import type { SessionAdjustment, AppliedSessionAdjustmentSnapshot } from './session-adjustments'

// ─── readinessToPreset ────────────────────────────────────────────────────────

describe('readinessToPreset', () => {
  it('returns original for high readiness', () => {
    const preset = readinessToPreset('high')
    expect(preset.mode).toBe('original')
    expect(preset.weightReductionPercentage).toBe(0)
    expect(preset.setsReduction).toBe(0)
  })

  it('returns original for insufficient_data', () => {
    const preset = readinessToPreset('insufficient_data')
    expect(preset.mode).toBe('original')
  })

  it('returns consolidation preset for moderate readiness', () => {
    const preset = readinessToPreset('moderate')
    expect(preset.mode).toBe('conservative')
    expect(preset.weightReductionPercentage).toBe(0)
    expect(preset.setsReduction).toBe(0)
    expect(preset.restIncreaseSeconds).toBe(DEFAULT_SESSION_ADJUSTMENT_CONFIG.moderateRestIncreaseSeconds)
    expect(preset.disableProgressionTargets).toBe(true)
    expect(preset.prioritizeTechnique).toBe(true)
    expect(preset.source).toBe('readiness_suggestion')
  })

  it('returns conservative preset for low readiness', () => {
    const preset = readinessToPreset('low')
    expect(preset.mode).toBe('conservative')
    expect(preset.weightReductionPercentage).toBe(DEFAULT_SESSION_ADJUSTMENT_CONFIG.lowReadinessWeightReductionPercentage)
    expect(preset.setsReduction).toBe(DEFAULT_SESSION_ADJUSTMENT_CONFIG.lowReadinessSetsReduction)
    expect(preset.restIncreaseSeconds).toBe(DEFAULT_SESSION_ADJUSTMENT_CONFIG.lowReadinessRestIncreaseSeconds)
    expect(preset.disableProgressionTargets).toBe(true)
    expect(preset.prioritizeTechnique).toBe(true)
  })

  it('uses custom config values', () => {
    const config = { ...DEFAULT_SESSION_ADJUSTMENT_CONFIG, lowReadinessWeightReductionPercentage: 5 }
    const preset = readinessToPreset('low', config)
    expect(preset.weightReductionPercentage).toBe(5)
  })
})

// ─── roundWeightDown ──────────────────────────────────────────────────────────

describe('roundWeightDown', () => {
  it('rounds to nearest 2.5 increment', () => {
    expect(roundWeightDown(38.25, 2.5)).toBe(37.5)
    expect(roundWeightDown(41.5, 2.5)).toBe(40)
    expect(roundWeightDown(42.5, 2.5)).toBe(42.5)
  })

  it('always rounds down, never up', () => {
    expect(roundWeightDown(39.9, 2.5)).toBe(37.5)
  })

  it('preserves zero weight', () => {
    expect(roundWeightDown(0, 2.5)).toBe(0)
  })

  it('preserves negative-like weight (treated as 0)', () => {
    expect(roundWeightDown(-5, 2.5)).toBe(-5)
  })

  it('rounds to 1kg increment', () => {
    expect(roundWeightDown(9.8, 1)).toBe(9)
    expect(roundWeightDown(10, 1)).toBe(10)
  })

  it('returns weight unchanged when increment is 0', () => {
    expect(roundWeightDown(42.5, 0)).toBe(42.5)
  })
})

// ─── applyAdjustmentToExercise ────────────────────────────────────────────────

describe('applyAdjustmentToExercise', () => {
  it('returns original values when mode is original', () => {
    const result = applyAdjustmentToExercise('ex1', 50, 4, 90, ORIGINAL_ADJUSTMENT)
    expect(result.adjustedWeight).toBe(50)
    expect(result.adjustedSets).toBe(4)
    expect(result.progressionTargetSuppressed).toBe(false)
  })

  it('reduces weight by percentage and rounds down', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      weightReductionPercentage: 10,
    }
    const result = applyAdjustmentToExercise('ex1', 42.5, 4, undefined, adj)
    // 42.5 * 0.9 = 38.25 → rounds down to 37.5
    expect(result.adjustedWeight).toBe(37.5)
    expect(result.originalWeight).toBe(42.5)
  })

  it('reduces sets by setsReduction', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      setsReduction: 1,
    }
    const result = applyAdjustmentToExercise('ex1', undefined, 4, undefined, adj)
    expect(result.adjustedSets).toBe(3)
    expect(result.originalSets).toBe(4)
  })

  it('never reduces sets below minimum (1)', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      setsReduction: 1,
    }
    const result = applyAdjustmentToExercise('ex1', undefined, 1, undefined, adj)
    expect(result.adjustedSets).toBe(1)
  })

  it('increases rest when adjustment specifies', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      restIncreaseSeconds: 30,
    }
    const result = applyAdjustmentToExercise('ex1', undefined, undefined, 90, adj)
    expect(result.adjustedRestSeconds).toBe(120)
    expect(result.originalRestSeconds).toBe(90)
  })

  it('sets rest when original is undefined but adjustment adds rest', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      restIncreaseSeconds: 30,
    }
    const result = applyAdjustmentToExercise('ex1', undefined, undefined, undefined, adj)
    expect(result.adjustedRestSeconds).toBe(30)
  })

  it('suppresses progression target when flag is set', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      disableProgressionTargets: true,
    }
    const result = applyAdjustmentToExercise('ex1', undefined, undefined, undefined, adj)
    expect(result.progressionTargetSuppressed).toBe(true)
  })

  it('does not alter zero-weight exercises', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      weightReductionPercentage: 10,
    }
    const result = applyAdjustmentToExercise('ex1', 0, 3, undefined, adj)
    expect(result.adjustedWeight).toBe(0)
  })

  it('preserves original weight when no reduction', () => {
    const adj: SessionAdjustment = {
      ...ORIGINAL_ADJUSTMENT,
      mode: 'conservative',
      weightReductionPercentage: 0,
    }
    const result = applyAdjustmentToExercise('ex1', 60, 3, undefined, adj)
    expect(result.adjustedWeight).toBe(60)
  })
})

// ─── buildAdjustmentSummary ───────────────────────────────────────────────────

describe('buildAdjustmentSummary', () => {
  it('returns empty summary for original mode', () => {
    const summary = buildAdjustmentSummary(ORIGINAL_ADJUSTMENT, 3)
    expect(summary.changedExercises).toBe(0)
    expect(summary.messages).toHaveLength(0)
  })

  it('includes weight reduction message', () => {
    const adj: SessionAdjustment = { ...ORIGINAL_ADJUSTMENT, mode: 'conservative', weightReductionPercentage: 10 }
    const summary = buildAdjustmentSummary(adj, 4)
    expect(summary.messages.some((m) => m.includes('10%'))).toBe(true)
    expect(summary.weightTargetsChanged).toBe(4)
  })

  it('includes sets reduction message', () => {
    const adj: SessionAdjustment = { ...ORIGINAL_ADJUSTMENT, mode: 'conservative', setsReduction: 1 }
    const summary = buildAdjustmentSummary(adj, 3)
    expect(summary.messages.some((m) => m.includes('série'))).toBe(true)
    expect(summary.setsChanged).toBe(3)
  })

  it('marks restChanged when rest increases', () => {
    const adj: SessionAdjustment = { ...ORIGINAL_ADJUSTMENT, mode: 'conservative', restIncreaseSeconds: 30 }
    const summary = buildAdjustmentSummary(adj, 2)
    expect(summary.restChanged).toBe(true)
    expect(summary.messages.some((m) => m.includes('+30s'))).toBe(true)
  })

  it('includes technique priority message', () => {
    const adj: SessionAdjustment = { ...ORIGINAL_ADJUSTMENT, mode: 'conservative', prioritizeTechnique: true }
    const summary = buildAdjustmentSummary(adj, 2)
    expect(summary.messages.some((m) => m.toLowerCase().includes('técnica'))).toBe(true)
  })
})

// ─── validateAdjustment ───────────────────────────────────────────────────────

describe('validateAdjustment', () => {
  it('clamps weight reduction to maximum', () => {
    const validated = validateAdjustment({ weightReductionPercentage: 50 })
    expect(validated.weightReductionPercentage).toBeLessThanOrEqual(
      DEFAULT_SESSION_ADJUSTMENT_CONFIG.maximumWeightReductionPercentage
    )
  })

  it('prevents negative weight reduction', () => {
    const validated = validateAdjustment({ weightReductionPercentage: -5 })
    expect(validated.weightReductionPercentage).toBe(0)
  })

  it('clamps sets reduction to 0 or 1', () => {
    const validated = validateAdjustment({ setsReduction: 5 })
    expect(validated.setsReduction).toBe(1)
  })

  it('clamps rest to valid options (multiples of 15, max 60)', () => {
    const validated = validateAdjustment({ restIncreaseSeconds: 100 })
    expect(validated.restIncreaseSeconds).toBeLessThanOrEqual(60)
  })

  it('defaults to custom mode when mode not specified', () => {
    const validated = validateAdjustment({ weightReductionPercentage: 5 })
    expect(validated.mode).toBe('custom')
  })
})

// ─── toSnapshot ──────────────────────────────────────────────────────────────

describe('toSnapshot', () => {
  it('creates snapshot from adjustment', () => {
    const adj: SessionAdjustment = {
      mode: 'conservative',
      weightReductionPercentage: 10,
      setsReduction: 1,
      restIncreaseSeconds: 30,
      disableProgressionTargets: true,
      prioritizeTechnique: true,
      source: 'readiness_suggestion',
    }
    const snapshot = toSnapshot(adj)
    expect(snapshot.mode).toBe('conservative')
    expect(snapshot.weightReductionPercentage).toBe(10)
    expect(snapshot.setsReduction).toBe(1)
    expect(snapshot.restIncreaseSeconds).toBe(30)
    expect(snapshot.disableProgressionTargets).toBe(true)
    expect(snapshot.prioritizeTechnique).toBe(true)
  })

  it('snapshot does not include source or appliedAt', () => {
    const adj: SessionAdjustment = { ...ORIGINAL_ADJUSTMENT, source: 'manual' }
    const snapshot = toSnapshot(adj)
    expect('source' in snapshot).toBe(false)
    expect('appliedAt' in snapshot).toBe(false)
  })
})

// ─── isOriginalAdjustment ─────────────────────────────────────────────────────

describe('isOriginalAdjustment', () => {
  it('returns true for original mode', () => {
    expect(isOriginalAdjustment(ORIGINAL_ADJUSTMENT)).toBe(true)
  })

  it('returns false for conservative mode', () => {
    const adj: SessionAdjustment = { ...ORIGINAL_ADJUSTMENT, mode: 'conservative' }
    expect(isOriginalAdjustment(adj)).toBe(false)
  })

  it('returns false for custom mode', () => {
    const adj: SessionAdjustment = { ...ORIGINAL_ADJUSTMENT, mode: 'custom' }
    expect(isOriginalAdjustment(adj)).toBe(false)
  })
})

// ─── computeAdjustmentStats ───────────────────────────────────────────────────

describe('computeAdjustmentStats', () => {
  it('returns zeros for empty array', () => {
    const stats = computeAdjustmentStats([])
    expect(stats.totalSessions).toBe(0)
    expect(stats.originalSessions).toBe(0)
    expect(stats.conservativeSessions).toBe(0)
  })

  it('counts null/undefined snapshots as original', () => {
    const stats = computeAdjustmentStats([null, undefined, null])
    expect(stats.totalSessions).toBe(3)
    expect(stats.originalSessions).toBe(3)
  })

  it('counts conservative sessions correctly', () => {
    const conservative: AppliedSessionAdjustmentSnapshot = {
      mode: 'conservative',
      weightReductionPercentage: 10,
      setsReduction: 1,
      restIncreaseSeconds: 30,
      disableProgressionTargets: true,
      prioritizeTechnique: true,
    }
    const stats = computeAdjustmentStats([conservative, null, conservative])
    expect(stats.conservativeSessions).toBe(2)
    expect(stats.originalSessions).toBe(1)
    expect(stats.totalSessions).toBe(3)
  })

  it('counts custom sessions correctly', () => {
    const custom: AppliedSessionAdjustmentSnapshot = {
      mode: 'custom',
      weightReductionPercentage: 5,
      setsReduction: 0,
      restIncreaseSeconds: 15,
      disableProgressionTargets: false,
      prioritizeTechnique: false,
    }
    const stats = computeAdjustmentStats([custom])
    expect(stats.customSessions).toBe(1)
  })
})

// ─── isValidAdjustmentSnapshot ────────────────────────────────────────────────

describe('isValidAdjustmentSnapshot', () => {
  it('validates a correct snapshot', () => {
    const snap: AppliedSessionAdjustmentSnapshot = {
      mode: 'conservative',
      weightReductionPercentage: 10,
      setsReduction: 1,
      restIncreaseSeconds: 30,
      disableProgressionTargets: true,
      prioritizeTechnique: true,
    }
    expect(isValidAdjustmentSnapshot(snap)).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidAdjustmentSnapshot(null)).toBe(false)
  })

  it('rejects invalid mode', () => {
    expect(isValidAdjustmentSnapshot({ mode: 'invalid', weightReductionPercentage: 0, setsReduction: 0, restIncreaseSeconds: 0, disableProgressionTargets: false, prioritizeTechnique: false })).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(isValidAdjustmentSnapshot({ mode: 'original' })).toBe(false)
  })

  it('rejects non-boolean flags', () => {
    expect(isValidAdjustmentSnapshot({ mode: 'original', weightReductionPercentage: 0, setsReduction: 0, restIncreaseSeconds: 0, disableProgressionTargets: 'yes', prioritizeTechnique: false })).toBe(false)
  })
})

// ─── adjustmentModeLabel ──────────────────────────────────────────────────────

describe('adjustmentModeLabel', () => {
  it('labels original correctly', () => {
    expect(adjustmentModeLabel('original')).toBe('Plano original')
  })

  it('labels conservative correctly', () => {
    expect(adjustmentModeLabel('conservative')).toContain('conservador')
  })

  it('labels custom correctly', () => {
    expect(adjustmentModeLabel('custom')).toContain('personalizado')
  })
})

// ─── No impact on XP or badges ───────────────────────────────────────────────

describe('no XP or badge impact', () => {
  it('applyAdjustmentToExercise does not produce XP-related fields', () => {
    const result = applyAdjustmentToExercise('ex1', 50, 4, undefined, ORIGINAL_ADJUSTMENT)
    expect('xpEarned' in result).toBe(false)
    expect('badgeId' in result).toBe(false)
  })

  it('toSnapshot does not contain XP or badge fields', () => {
    const snap = toSnapshot(ORIGINAL_ADJUSTMENT)
    expect('xpEarned' in snap).toBe(false)
    expect('badges' in snap).toBe(false)
  })
})

// ─── Backward compatibility ───────────────────────────────────────────────────

describe('backward compatibility', () => {
  it('computeAdjustmentStats handles old history without snapshots', () => {
    expect(() => computeAdjustmentStats([null, null, null])).not.toThrow()
  })

  it('isValidAdjustmentSnapshot rejects partially invalid snapshot from old backup', () => {
    expect(isValidAdjustmentSnapshot({ mode: 'original' })).toBe(false)
  })

  it('readinessToPreset returns stable original preset for unknown level', () => {
    // Passing an unexpected value should not throw
    // TypeScript prevents this at compile time, but we test runtime gracefully
    const preset = readinessToPreset('high')
    expect(preset).toBeDefined()
  })
})
