import { describe, it, expect, beforeEach } from 'vitest'
import {
  upsertCycleWeekAnnotation,
  deleteCycleWeekAnnotation,
  getCycleWeekAnnotations,
  getAnnotationsByCycle,
  getAnnotationForWeek,
  importCycleWeekAnnotations,
  CYCLE_WEEK_TYPE_LABELS,
} from './training-cycle-weeks'

beforeEach(() => {
  window.localStorage.clear()
})

describe('upsertCycleWeekAnnotation', () => {
  it('creates an annotation for a classified week', () => {
    const result = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'recovery' })
    expect(result).not.toBeNull()
    expect(result?.type).toBe('recovery')
  })

  it('does not persist an implicit normal week with no notes', () => {
    const result = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'normal' })
    expect(result).toBeNull()
    expect(getCycleWeekAnnotations()).toHaveLength(0)
  })

  it('persists a normal week when it carries a note', () => {
    const result = upsertCycleWeekAnnotation({
      cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'normal', notes: 'Semana comum, só registrando',
    })
    expect(result).not.toBeNull()
  })

  it('updates the existing annotation instead of duplicating it', () => {
    upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'test' })
    const updated = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'transition' })
    expect(getAnnotationsByCycle('cycle-1')).toHaveLength(1)
    expect(updated?.type).toBe('transition')
  })

  it('normalizes the week start date to Monday', () => {
    // 2026-08-05 is a Wednesday; Monday of that week is 2026-08-03
    const result = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-05', type: 'recovery' })
    expect(result?.weekStartDate).toBe('2026-08-03')
  })

  it('returns null for a missing cycleId', () => {
    expect(upsertCycleWeekAnnotation({ cycleId: '', weekStartDate: '2026-08-03', type: 'recovery' })).toBeNull()
  })

  it('supports the test week type', () => {
    const result = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'test' })
    expect(result?.type).toBe('test')
  })

  it('supports the transition week type', () => {
    const result = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'transition' })
    expect(result?.type).toBe('transition')
  })
})

describe('getAnnotationForWeek', () => {
  it('finds an annotation for the given week regardless of weekday passed in', () => {
    upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'recovery' })
    expect(getAnnotationForWeek('cycle-1', '2026-08-06')?.type).toBe('recovery')
  })

  it('returns null when no annotation exists', () => {
    expect(getAnnotationForWeek('cycle-1', '2026-08-03')).toBeNull()
  })
})

describe('getAnnotationsByCycle', () => {
  it('returns annotations sorted by week ascending, scoped to the cycle', () => {
    upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-17', type: 'test' })
    upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'recovery' })
    upsertCycleWeekAnnotation({ cycleId: 'cycle-2', weekStartDate: '2026-08-10', type: 'transition' })

    const result = getAnnotationsByCycle('cycle-1')
    expect(result.map((a) => a.weekStartDate)).toEqual(['2026-08-03', '2026-08-17'])
  })
})

describe('deleteCycleWeekAnnotation', () => {
  it('removes an existing annotation', () => {
    const created = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'recovery' })!
    expect(deleteCycleWeekAnnotation(created.id)).toBe(true)
    expect(getCycleWeekAnnotations()).toHaveLength(0)
  })

  it('returns false for an unknown id', () => {
    expect(deleteCycleWeekAnnotation('missing')).toBe(false)
  })
})

describe('importCycleWeekAnnotations', () => {
  it('imports valid annotations and skips invalid/duplicate ones', () => {
    const existing = upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-03', type: 'recovery' })!
    const result = importCycleWeekAnnotations([
      existing,
      {
        id: 'week-annotation-x', cycleId: 'cycle-2', weekStartDate: '2026-08-10',
        type: 'test', createdAt: 'x', updatedAt: 'x',
      },
      { id: 'invalid' },
      // duplicate key (same cycle+week) with a different id — should still be skipped
      {
        id: 'week-annotation-dup', cycleId: 'cycle-1', weekStartDate: '2026-08-03',
        type: 'transition', createdAt: 'x', updatedAt: 'x',
      },
    ])
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(3)
    expect(getCycleWeekAnnotations()).toHaveLength(2)
  })

  it('handles non-array input gracefully', () => {
    const result = importCycleWeekAnnotations('not-an-array' as unknown as unknown[])
    expect(result).toEqual({ imported: 0, skipped: 0 })
  })
})

describe('CYCLE_WEEK_TYPE_LABELS', () => {
  it('has a label for every type', () => {
    const types = ['normal', 'recovery', 'test', 'transition'] as const
    for (const t of types) {
      expect(CYCLE_WEEK_TYPE_LABELS[t]).toBeTruthy()
    }
  })
})
