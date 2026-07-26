import { describe, it, expect } from 'vitest'
import { computeConfidence, computePriority } from './priority'
import type { CoachRuleFinding } from './types'

function finding(overrides: Partial<CoachRuleFinding>): CoachRuleFinding {
  return {
    category: 'recovery',
    title: 't',
    summary: 's',
    evidence: [],
    sampleSize: 0,
    weight: 0,
    actions: [],
    suggestion: 'sug',
    ...overrides,
  }
}

describe('computeConfidence', () => {
  it('is low below 3 samples, medium from 3-5, high from 6+', () => {
    expect(computeConfidence(finding({ sampleSize: 0 }))).toBe('low')
    expect(computeConfidence(finding({ sampleSize: 2 }))).toBe('low')
    expect(computeConfidence(finding({ sampleSize: 3 }))).toBe('medium')
    expect(computeConfidence(finding({ sampleSize: 5 }))).toBe('medium')
    expect(computeConfidence(finding({ sampleSize: 6 }))).toBe('high')
    expect(computeConfidence(finding({ sampleSize: 100 }))).toBe('high')
  })
})

describe('computePriority', () => {
  it('is high only when weight is high AND confidence is not low', () => {
    expect(computePriority(finding({ weight: 0.9, sampleSize: 6 }))).toBe('high')
    expect(computePriority(finding({ weight: 0.9, sampleSize: 1 }))).toBe('medium') // high weight but low confidence never reaches 'high'
  })

  it('is medium for mid weight regardless of confidence', () => {
    expect(computePriority(finding({ weight: 0.5, sampleSize: 1 }))).toBe('medium')
    expect(computePriority(finding({ weight: 0.5, sampleSize: 6 }))).toBe('medium')
  })

  it('is low for weak weight', () => {
    expect(computePriority(finding({ weight: 0.1, sampleSize: 6 }))).toBe('low')
  })
})
