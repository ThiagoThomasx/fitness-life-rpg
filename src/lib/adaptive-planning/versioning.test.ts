import { describe, it, expect } from 'vitest'
import { describeVersionTransition, isProgramVersionStale } from './versioning'

describe('describeVersionTransition', () => {
  it('reports previous and new version from resolved entities', () => {
    expect(describeVersionTransition({ version: 3 }, { version: 4 })).toEqual({ previousVersion: 3, newVersion: 4 })
  })
})

describe('isProgramVersionStale', () => {
  it('is false when the target does not pin a version', () => {
    expect(isProgramVersionStale({ kind: 'program', programId: 'p1' }, 5)).toBe(false)
  })

  it('is false when the pinned version matches the current one', () => {
    expect(isProgramVersionStale({ kind: 'program', programId: 'p1', programVersion: 3 }, 3)).toBe(false)
  })

  it('is true when the pinned version no longer matches', () => {
    expect(isProgramVersionStale({ kind: 'program', programId: 'p1', programVersion: 3 }, 4)).toBe(true)
  })
})
