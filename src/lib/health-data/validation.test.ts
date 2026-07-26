import { describe, it, expect } from 'vitest'
import { isValidHealthDataRecord, isValueInRange, validateHealthDataInput } from './validation'
import type { HealthDataRecord, NewHealthDataRecordInput } from './types'

const baseSteps: NewHealthDataRecordInput = {
  metric: 'steps',
  value: 8000,
  recordedAt: '2026-07-26T10:00:00.000Z',
  source: 'manual',
}

describe('validateHealthDataInput — steps', () => {
  it('accepts a plausible value', () => {
    expect(validateHealthDataInput(baseSteps).valid).toBe(true)
  })

  it('rejects a negative value', () => {
    expect(validateHealthDataInput({ ...baseSteps, value: -5 }).valid).toBe(false)
  })

  it('rejects a non-integer value', () => {
    expect(validateHealthDataInput({ ...baseSteps, value: 100.5 }).valid).toBe(false)
  })

  it('rejects an absurdly high value', () => {
    expect(validateHealthDataInput({ ...baseSteps, value: 1_000_000 }).valid).toBe(false)
  })
})

describe('validateHealthDataInput — sleep', () => {
  it('accepts a valid start/end matching duration', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'sleep_duration',
      value: 420,
      recordedAt: '2026-07-26T07:00:00.000Z',
      startAt: '2026-07-26T00:00:00.000Z',
      endAt: '2026-07-26T07:00:00.000Z',
      source: 'manual',
    }
    expect(validateHealthDataInput(input).valid).toBe(true)
  })

  it('rejects start after end (inverted interval)', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'sleep_duration',
      value: 420,
      recordedAt: '2026-07-26T07:00:00.000Z',
      startAt: '2026-07-26T07:00:00.000Z',
      endAt: '2026-07-26T00:00:00.000Z',
      source: 'manual',
    }
    expect(validateHealthDataInput(input).valid).toBe(false)
  })

  it('rejects a duration that does not match the given interval', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'sleep_duration',
      value: 10,
      recordedAt: '2026-07-26T07:00:00.000Z',
      startAt: '2026-07-26T00:00:00.000Z',
      endAt: '2026-07-26T07:00:00.000Z',
      source: 'manual',
    }
    expect(validateHealthDataInput(input).valid).toBe(false)
  })

  it('rejects a negative duration with no interval', () => {
    expect(
      validateHealthDataInput({
        metric: 'sleep_duration',
        value: -10,
        recordedAt: '2026-07-26T07:00:00.000Z',
        source: 'manual',
      }).valid
    ).toBe(false)
  })
})

describe('validateHealthDataInput — weight', () => {
  it('rejects an implausible weight', () => {
    expect(
      validateHealthDataInput({
        metric: 'weight',
        value: 900,
        recordedAt: '2026-07-26T07:00:00.000Z',
        source: 'manual',
      }).valid
    ).toBe(false)
  })
})

describe('validateHealthDataInput — resting heart rate', () => {
  it('rejects an implausible resting heart rate', () => {
    expect(
      validateHealthDataInput({
        metric: 'resting_heart_rate',
        value: 900,
        recordedAt: '2026-07-26T07:00:00.000Z',
        source: 'manual',
      }).valid
    ).toBe(false)
  })
})

describe('validateHealthDataInput — timestamps', () => {
  it('rejects an invalid recordedAt', () => {
    expect(validateHealthDataInput({ ...baseSteps, recordedAt: 'not-a-date' }).valid).toBe(false)
  })

  it('rejects an unknown unit implicitly via isValueInRange guard', () => {
    expect(isValueInRange('steps', Number.NaN)).toBe(false)
  })
})

describe('isValidHealthDataRecord', () => {
  const validRecord: HealthDataRecord = {
    id: 'health-steps-1',
    metric: 'steps',
    value: 8000,
    unit: 'count',
    recordedAt: '2026-07-26T10:00:00.000Z',
    source: 'manual',
    importedAt: '2026-07-26T10:00:00.000Z',
    quality: 'high',
  }

  it('accepts a well-formed record', () => {
    expect(isValidHealthDataRecord(validRecord)).toBe(true)
  })

  it('rejects a record with an out-of-range value', () => {
    expect(isValidHealthDataRecord({ ...validRecord, value: -1 })).toBe(false)
  })

  it('rejects a record with an unknown metric', () => {
    expect(isValidHealthDataRecord({ ...validRecord, metric: 'unknown_metric' })).toBe(false)
  })

  it('rejects a record with non-primitive metadata values', () => {
    expect(isValidHealthDataRecord({ ...validRecord, metadata: { nested: {} } })).toBe(false)
  })
})
