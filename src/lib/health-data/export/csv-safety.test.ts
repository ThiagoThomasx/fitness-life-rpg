import { describe, it, expect } from 'vitest'
import { csvField, csvRow, escapeCsvValue, neutralizeCsvFormula } from './csv-safety'

describe('escapeCsvValue', () => {
  it('quotes a value containing a comma', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
  })

  it('quotes a value containing a semicolon', () => {
    expect(escapeCsvValue('a;b')).toBe('"a;b"')
  })

  it('quotes and escapes embedded quotes', () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes a value containing a newline', () => {
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"')
  })

  it('leaves a plain value untouched', () => {
    expect(escapeCsvValue('steps')).toBe('steps')
  })

  it('leaves an empty value untouched', () => {
    expect(escapeCsvValue('')).toBe('')
  })
})

describe('neutralizeCsvFormula', () => {
  it('prefixes a value starting with "=" with an apostrophe', () => {
    expect(neutralizeCsvFormula('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
  })

  it('prefixes a value starting with "+"', () => {
    expect(neutralizeCsvFormula('+CMD')).toBe("'+CMD")
  })

  it('prefixes a value starting with "-CMD" (non-numeric text)', () => {
    expect(neutralizeCsvFormula('-CMD')).toBe("'-CMD")
  })

  it('prefixes a value starting with "@"', () => {
    expect(neutralizeCsvFormula('@CMD')).toBe("'@CMD")
  })

  it('leaves a value starting with a normal letter untouched', () => {
    expect(neutralizeCsvFormula('manual')).toBe('manual')
  })

  it('leaves an empty value untouched', () => {
    expect(neutralizeCsvFormula('')).toBe('')
  })
})

describe('csvField', () => {
  it('renders undefined/null as an empty field', () => {
    expect(csvField(undefined)).toBe('')
    expect(csvField(null)).toBe('')
  })

  it('neutralizes formula injection in a textual field', () => {
    expect(csvField('=CMD')).toBe("'=CMD")
  })

  it('does not neutralize a negative numeric field', () => {
    expect(csvField(-5, { numeric: true })).toBe('-5')
  })

  it('does not neutralize a numeric field even if the source metric is 0', () => {
    expect(csvField(0, { numeric: true })).toBe('0')
  })
})

describe('csvRow', () => {
  it('builds a safe row mixing textual and numeric fields', () => {
    const row = csvRow([
      { value: 'steps' },
      { value: -5, numeric: true },
      { value: '=CMD' },
    ])
    expect(row).toBe("steps,-5,'=CMD")
  })
})
