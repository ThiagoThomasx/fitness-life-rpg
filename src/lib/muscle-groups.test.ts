import { describe, it, expect } from 'vitest'
import { normalizeMuscleGroups, RECOVERY_HOURS, MUSCLE_GROUP_LABELS } from './muscle-groups'

describe('normalizeMuscleGroups', () => {
  it('maps chest-related free-text terms to peito', () => {
    expect(normalizeMuscleGroups(['peitoral'])).toEqual(['peito'])
    expect(normalizeMuscleGroups(['peitoral superior'])).toEqual(['peito'])
  })

  it('maps back-related free-text terms to costas', () => {
    expect(normalizeMuscleGroups(['costas'])).toEqual(['costas'])
    expect(normalizeMuscleGroups(['latíssimo'])).toEqual(['costas'])
    expect(normalizeMuscleGroups(['costas média'])).toEqual(['costas'])
    expect(normalizeMuscleGroups(['lombar'])).toEqual(['costas'])
  })

  it('maps leg-related free-text terms to pernas', () => {
    expect(normalizeMuscleGroups(['quadríceps'])).toEqual(['pernas'])
    expect(normalizeMuscleGroups(['glúteos'])).toEqual(['pernas'])
    expect(normalizeMuscleGroups(['isquiotibiais'])).toEqual(['pernas'])
    expect(normalizeMuscleGroups(['panturrilhas'])).toEqual(['pernas'])
    expect(normalizeMuscleGroups(['quadril'])).toEqual(['pernas'])
  })

  it('maps shoulder, biceps, triceps and core terms', () => {
    expect(normalizeMuscleGroups(['ombros'])).toEqual(['ombros'])
    expect(normalizeMuscleGroups(['deltoide lateral'])).toEqual(['ombros'])
    expect(normalizeMuscleGroups(['bíceps'])).toEqual(['biceps'])
    expect(normalizeMuscleGroups(['braquial'])).toEqual(['biceps'])
    expect(normalizeMuscleGroups(['tríceps'])).toEqual(['triceps'])
    expect(normalizeMuscleGroups(['core'])).toEqual(['core'])
    expect(normalizeMuscleGroups(['abdômen'])).toEqual(['core'])
  })

  it('is case and accent insensitive', () => {
    expect(normalizeMuscleGroups(['PEITORAL'])).toEqual(['peito'])
    expect(normalizeMuscleGroups(['Tríceps'])).toEqual(['triceps'])
    expect(normalizeMuscleGroups(['triceps'])).toEqual(['triceps'])
  })

  it('deduplicates canonical groups from multiple raw terms', () => {
    expect(normalizeMuscleGroups(['peitoral', 'peitoral superior'])).toEqual(['peito'])
  })

  it('ignores unmapped free-text terms without throwing', () => {
    expect(normalizeMuscleGroups(['corpo todo'])).toEqual([])
    expect(normalizeMuscleGroups(['cardiovascular'])).toEqual([])
    expect(normalizeMuscleGroups(['pescoço'])).toEqual([])
  })

  it('resolves a mixed list to only its mappable canonical groups', () => {
    expect(normalizeMuscleGroups(['peitoral', 'tríceps', 'ombros'])).toEqual(
      expect.arrayContaining(['peito', 'triceps', 'ombros'])
    )
  })

  it('returns an empty array for an empty input', () => {
    expect(normalizeMuscleGroups([])).toEqual([])
  })
})

describe('RECOVERY_HOURS', () => {
  it('defines a positive recovery window for every canonical muscle group', () => {
    for (const group of Object.keys(MUSCLE_GROUP_LABELS)) {
      expect(RECOVERY_HOURS[group as keyof typeof RECOVERY_HOURS]).toBeGreaterThan(0)
    }
  })

  it('matches the sprint-specified recovery windows', () => {
    expect(RECOVERY_HOURS.peito).toBe(72)
    expect(RECOVERY_HOURS.costas).toBe(72)
    expect(RECOVERY_HOURS.pernas).toBe(96)
    expect(RECOVERY_HOURS.ombros).toBe(48)
    expect(RECOVERY_HOURS.biceps).toBe(48)
    expect(RECOVERY_HOURS.triceps).toBe(48)
    expect(RECOVERY_HOURS.core).toBe(24)
  })
})
