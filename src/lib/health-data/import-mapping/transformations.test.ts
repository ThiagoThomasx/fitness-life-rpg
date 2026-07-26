import { describe, it, expect } from 'vitest'
import { applyTransformation, applyTransformationChain } from './transformations'
import type { HealthImportTransformation } from './types'

describe('applyTransformation', () => {
  it('trims whitespace', () => {
    expect(applyTransformation('  8000  ', { kind: 'trim' })).toEqual({ value: '8000' })
  })

  it('lowercases text', () => {
    expect(applyTransformation('STEPS', { kind: 'lowercase' })).toEqual({ value: 'steps' })
  })

  it('uppercases text', () => {
    expect(applyTransformation('steps', { kind: 'uppercase' })).toEqual({ value: 'STEPS' })
  })

  it('replaces text', () => {
    expect(applyTransformation('a-b-c', { kind: 'replace', search: '-', replacement: '_' })).toEqual({ value: 'a_b_c' })
  })

  it('parses a number with a comma decimal separator', () => {
    expect(applyTransformation('72,5', { kind: 'parse_number', decimalSeparator: ',' })).toEqual({ value: '72.5' })
  })

  it('reports an error for an unparseable number', () => {
    const result = applyTransformation('abc', { kind: 'parse_number', decimalSeparator: '.' })
    expect(result.error).toBeDefined()
  })

  it('parses a date in a given format', () => {
    expect(applyTransformation('12/07/2026', { kind: 'parse_date', format: 'DD/MM/YYYY' })).toEqual({
      value: '2026-07-12T00:00:00.000Z',
    })
  })

  it('reports an error for an unparseable date', () => {
    const result = applyTransformation('31/02/2026', { kind: 'parse_date', format: 'DD/MM/YYYY' })
    expect(result.error).toBeDefined()
  })

  it('applies unit_conversion by defaulting to fromUnit when the raw value is empty', () => {
    expect(applyTransformation('', { kind: 'unit_conversion', fromUnit: 'lb' })).toEqual({ value: 'lb' })
  })

  it('applies unit_conversion by keeping a present raw value', () => {
    expect(applyTransformation('kg', { kind: 'unit_conversion', fromUnit: 'lb' })).toEqual({ value: 'kg' })
  })

  it('maps a textual value to a number', () => {
    const transformation: HealthImportTransformation = { kind: 'map_value', valueMap: { Excelente: 5, Boa: 4 } }
    expect(applyTransformation('Excelente', transformation)).toEqual({ value: '5' })
  })

  it('reports an error for a value missing from the value map', () => {
    const transformation: HealthImportTransformation = { kind: 'map_value', valueMap: { Excelente: 5 } }
    const result = applyTransformation('Desconhecido', transformation)
    expect(result.error).toBeDefined()
  })

  it('reports an error for combine_date_time (requires row context, resolved elsewhere)', () => {
    const result = applyTransformation('12/07/2026', { kind: 'combine_date_time', dateFormat: 'DD/MM/YYYY' })
    expect(result.error).toBeDefined()
  })
})

describe('applyTransformationChain', () => {
  it('applies transformations in order', () => {
    const chain: HealthImportTransformation[] = [{ kind: 'trim' }, { kind: 'lowercase' }]
    expect(applyTransformationChain('  STEPS  ', chain)).toEqual({ value: 'steps' })
  })

  it('stops at the first failing transformation', () => {
    const chain: HealthImportTransformation[] = [{ kind: 'parse_number', decimalSeparator: '.' }, { kind: 'lowercase' }]
    const result = applyTransformationChain('not-a-number', chain)
    expect(result.error).toBeDefined()
  })

  it('returns the raw value unchanged when the chain is empty', () => {
    expect(applyTransformationChain('8000', [])).toEqual({ value: '8000' })
  })
})
