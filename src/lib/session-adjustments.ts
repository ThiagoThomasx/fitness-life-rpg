import type { ReadinessLevel } from './workout-readiness'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionAdjustmentMode = 'original' | 'conservative' | 'custom'

export interface SessionAdjustment {
  mode: SessionAdjustmentMode
  weightReductionPercentage: number
  setsReduction: number
  restIncreaseSeconds: number
  disableProgressionTargets: boolean
  prioritizeTechnique: boolean
  source: 'readiness_suggestion' | 'manual'
  appliedAt?: string
}

export interface AdjustedExerciseTarget {
  exerciseId: string
  originalWeight?: number
  adjustedWeight?: number
  originalSets?: number
  adjustedSets?: number
  originalRestSeconds?: number
  adjustedRestSeconds?: number
  progressionTargetSuppressed: boolean
}

export interface SessionAdjustmentSummary {
  changedExercises: number
  weightTargetsChanged: number
  setsChanged: number
  restChanged: boolean
  messages: string[]
}

export interface AppliedSessionAdjustmentSnapshot {
  mode: SessionAdjustmentMode
  weightReductionPercentage: number
  setsReduction: number
  restIncreaseSeconds: number
  disableProgressionTargets: boolean
  prioritizeTechnique: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface SessionAdjustmentConfig {
  moderateRestIncreaseSeconds: number
  lowReadinessWeightReductionPercentage: number
  lowReadinessSetsReduction: number
  lowReadinessRestIncreaseSeconds: number
  minimumWeight: number
  minimumSets: number
  weightRoundingIncrement: number
  maximumWeightReductionPercentage: number
}

export const DEFAULT_SESSION_ADJUSTMENT_CONFIG: SessionAdjustmentConfig = {
  moderateRestIncreaseSeconds: 30,
  lowReadinessWeightReductionPercentage: 10,
  lowReadinessSetsReduction: 1,
  lowReadinessRestIncreaseSeconds: 30,
  minimumWeight: 0,
  minimumSets: 1,
  weightRoundingIncrement: 2.5,
  maximumWeightReductionPercentage: 15,
}

export const ORIGINAL_ADJUSTMENT: SessionAdjustment = {
  mode: 'original',
  weightReductionPercentage: 0,
  setsReduction: 0,
  restIncreaseSeconds: 0,
  disableProgressionTargets: false,
  prioritizeTechnique: false,
  source: 'manual',
}

// ─── Rounding ─────────────────────────────────────────────────────────────────

/**
 * Rounds a weight DOWN to the nearest increment.
 * Never rounds up when the intent is to reduce load.
 * Zero-weight exercises (bodyweight, time-based) are preserved as-is.
 */
export function roundWeightDown(weight: number, increment: number): number {
  if (weight <= 0) return weight
  if (increment <= 0) return weight
  return Math.floor(weight / increment) * increment
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export function readinessToPreset(
  level: ReadinessLevel,
  config: SessionAdjustmentConfig = DEFAULT_SESSION_ADJUSTMENT_CONFIG
): SessionAdjustment {
  if (level === 'high' || level === 'insufficient_data') {
    return ORIGINAL_ADJUSTMENT
  }

  if (level === 'moderate') {
    return {
      mode: 'conservative',
      weightReductionPercentage: 0,
      setsReduction: 0,
      restIncreaseSeconds: config.moderateRestIncreaseSeconds,
      disableProgressionTargets: true,
      prioritizeTechnique: true,
      source: 'readiness_suggestion',
      appliedAt: new Date().toISOString(),
    }
  }

  // low
  return {
    mode: 'conservative',
    weightReductionPercentage: config.lowReadinessWeightReductionPercentage,
    setsReduction: config.lowReadinessSetsReduction,
    restIncreaseSeconds: config.lowReadinessRestIncreaseSeconds,
    disableProgressionTargets: true,
    prioritizeTechnique: true,
    source: 'readiness_suggestion',
    appliedAt: new Date().toISOString(),
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateAdjustment(
  adj: Partial<SessionAdjustment>,
  config: SessionAdjustmentConfig = DEFAULT_SESSION_ADJUSTMENT_CONFIG
): SessionAdjustment {
  const pct = Math.min(
    config.maximumWeightReductionPercentage,
    Math.max(0, Math.round(adj.weightReductionPercentage ?? 0))
  )
  const sets = Math.max(0, Math.min(1, Math.round(adj.setsReduction ?? 0)))
  const rest = Math.max(0, Math.min(60, Math.round((adj.restIncreaseSeconds ?? 0) / 15) * 15))

  return {
    mode: adj.mode ?? 'custom',
    weightReductionPercentage: pct,
    setsReduction: sets,
    restIncreaseSeconds: rest,
    disableProgressionTargets: adj.disableProgressionTargets ?? false,
    prioritizeTechnique: adj.prioritizeTechnique ?? false,
    source: adj.source ?? 'manual',
    appliedAt: adj.appliedAt,
  }
}

// ─── Apply to exercise target ─────────────────────────────────────────────────

export function applyAdjustmentToExercise(
  exerciseId: string,
  originalWeight: number | undefined,
  originalSets: number | undefined,
  originalRest: number | undefined,
  adjustment: SessionAdjustment,
  config: SessionAdjustmentConfig = DEFAULT_SESSION_ADJUSTMENT_CONFIG
): AdjustedExerciseTarget {
  if (adjustment.mode === 'original') {
    return {
      exerciseId,
      originalWeight,
      adjustedWeight: originalWeight,
      originalSets,
      adjustedSets: originalSets,
      originalRestSeconds: originalRest,
      adjustedRestSeconds: originalRest,
      progressionTargetSuppressed: false,
    }
  }

  let adjustedWeight = originalWeight
  if (originalWeight !== undefined && originalWeight > 0 && adjustment.weightReductionPercentage > 0) {
    const reduced = originalWeight * (1 - adjustment.weightReductionPercentage / 100)
    adjustedWeight = Math.max(
      config.minimumWeight,
      roundWeightDown(reduced, config.weightRoundingIncrement)
    )
  }

  let adjustedSets = originalSets
  if (originalSets !== undefined && adjustment.setsReduction > 0) {
    adjustedSets = Math.max(config.minimumSets, originalSets - adjustment.setsReduction)
  }

  const adjustedRest =
    originalRest !== undefined
      ? originalRest + adjustment.restIncreaseSeconds
      : adjustment.restIncreaseSeconds > 0
        ? adjustment.restIncreaseSeconds
        : undefined

  return {
    exerciseId,
    originalWeight,
    adjustedWeight,
    originalSets,
    adjustedSets,
    originalRestSeconds: originalRest,
    adjustedRestSeconds: adjustedRest,
    progressionTargetSuppressed: adjustment.disableProgressionTargets,
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function buildAdjustmentSummary(
  adjustment: SessionAdjustment,
  exerciseCount: number
): SessionAdjustmentSummary {
  if (adjustment.mode === 'original') {
    return {
      changedExercises: 0,
      weightTargetsChanged: 0,
      setsChanged: 0,
      restChanged: false,
      messages: [],
    }
  }

  const messages: string[] = []
  const weightTargetsChanged = adjustment.weightReductionPercentage > 0 ? exerciseCount : 0
  const setsChanged = adjustment.setsReduction > 0 ? exerciseCount : 0
  const restChanged = adjustment.restIncreaseSeconds > 0

  if (adjustment.weightReductionPercentage > 0) {
    messages.push(`Carga-alvo reduzida em ${adjustment.weightReductionPercentage}%`)
  }
  if (adjustment.setsReduction > 0) {
    messages.push(`${adjustment.setsReduction} série a menos por exercício`)
  }
  if (restChanged) {
    messages.push(`+${adjustment.restIncreaseSeconds}s de descanso entre séries`)
  }
  if (adjustment.disableProgressionTargets) {
    messages.push('Progressão não é o foco desta sessão')
  }
  if (adjustment.prioritizeTechnique) {
    messages.push('Priorize a técnica')
  }

  return {
    changedExercises: exerciseCount,
    weightTargetsChanged,
    setsChanged,
    restChanged,
    messages,
  }
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

export function toSnapshot(adj: SessionAdjustment): AppliedSessionAdjustmentSnapshot {
  return {
    mode: adj.mode,
    weightReductionPercentage: adj.weightReductionPercentage,
    setsReduction: adj.setsReduction,
    restIncreaseSeconds: adj.restIncreaseSeconds,
    disableProgressionTargets: adj.disableProgressionTargets,
    prioritizeTechnique: adj.prioritizeTechnique,
  }
}

export function isOriginalAdjustment(adj: SessionAdjustment): boolean {
  return adj.mode === 'original'
}

// ─── Mode labels ──────────────────────────────────────────────────────────────

export function adjustmentModeLabel(mode: SessionAdjustmentMode): string {
  switch (mode) {
    case 'original': return 'Plano original'
    case 'conservative': return 'Modo conservador'
    case 'custom': return 'Ajuste personalizado'
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isValidAdjustmentSnapshot(raw: unknown): raw is AppliedSessionAdjustmentSnapshot {
  if (typeof raw !== 'object' || raw === null) return false
  const s = raw as Record<string, unknown>
  return (
    (s.mode === 'original' || s.mode === 'conservative' || s.mode === 'custom') &&
    typeof s.weightReductionPercentage === 'number' &&
    typeof s.setsReduction === 'number' &&
    typeof s.restIncreaseSeconds === 'number' &&
    typeof s.disableProgressionTargets === 'boolean' &&
    typeof s.prioritizeTechnique === 'boolean'
  )
}

// ─── Adjustment stats for Dashboard/Insights/Profile ─────────────────────────

export interface AdjustmentHistoryStats {
  totalSessions: number
  originalSessions: number
  conservativeSessions: number
  customSessions: number
  undoneCount: number
}

export function computeAdjustmentStats(
  snapshots: (AppliedSessionAdjustmentSnapshot | undefined | null)[]
): AdjustmentHistoryStats {
  let original = 0
  let conservative = 0
  let custom = 0

  for (const s of snapshots) {
    if (!s) {
      original++
    } else if (s.mode === 'original') {
      original++
    } else if (s.mode === 'conservative') {
      conservative++
    } else {
      custom++
    }
  }

  return {
    totalSessions: snapshots.length,
    originalSessions: original,
    conservativeSessions: conservative,
    customSessions: custom,
    undoneCount: 0,
  }
}
