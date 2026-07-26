import { describe, it, expect } from 'vitest'
import { isAmbiguousSlashDate, parseDateWithFormat, parseNumberWithSeparators, sanitizeCsvTextField } from './helpers'

describe('parseNumberWithSeparators', () => {
  it('parses a dot decimal number', () => {
    expect(parseNumberWithSeparators('72.5', '.')).toBe(72.5)
  })

  it('parses a comma decimal number', () => {
    expect(parseNumberWithSeparators('72,5', ',')).toBe(72.5)
  })

  it('parses a dot-thousand comma-decimal number', () => {
    expect(parseNumberWithSeparators('1.234,5', ',')).toBe(1234.5)
  })

  it('parses a comma-thousand dot-decimal number', () => {
    expect(parseNumberWithSeparators('1,234.5', '.')).toBe(1234.5)
  })

  it('parses negative numbers', () => {
    expect(parseNumberWithSeparators('-5.5', '.')).toBe(-5.5)
  })

  it('returns null for empty string', () => {
    expect(parseNumberWithSeparators('', '.')).toBeNull()
  })

  it('returns null for non-numeric text', () => {
    expect(parseNumberWithSeparators('abc', '.')).toBeNull()
  })

  it('returns null for infinity-like text', () => {
    expect(parseNumberWithSeparators('Infinity', '.')).toBeNull()
  })
})

describe('parseDateWithFormat', () => {
  it('parses ISO', () => {
    expect(parseDateWithFormat('2026-07-12T10:00:00.000Z', 'ISO')).toBe('2026-07-12T10:00:00.000Z')
  })

  it('parses YYYY-MM-DD', () => {
    expect(parseDateWithFormat('2026-07-12', 'YYYY-MM-DD')).toBe('2026-07-12T00:00:00.000Z')
  })

  it('parses DD/MM/YYYY', () => {
    expect(parseDateWithFormat('12/07/2026', 'DD/MM/YYYY')).toBe('2026-07-12T00:00:00.000Z')
  })

  it('parses MM/DD/YYYY', () => {
    expect(parseDateWithFormat('07/12/2026', 'MM/DD/YYYY')).toBe('2026-07-12T00:00:00.000Z')
  })

  it('parses DD-MM-YYYY', () => {
    expect(parseDateWithFormat('12-07-2026', 'DD-MM-YYYY')).toBe('2026-07-12T00:00:00.000Z')
  })

  it('parses YYYY/MM/DD', () => {
    expect(parseDateWithFormat('2026/07/12', 'YYYY/MM/DD')).toBe('2026-07-12T00:00:00.000Z')
  })

  it('parses DD/MM/YYYY HH:mm', () => {
    expect(parseDateWithFormat('12/07/2026 14:30', 'DD/MM/YYYY HH:mm')).toBe('2026-07-12T14:30:00.000Z')
  })

  it('parses YYYY-MM-DD HH:mm:ss', () => {
    expect(parseDateWithFormat('2026-07-12 14:30:45', 'YYYY-MM-DD HH:mm:ss')).toBe('2026-07-12T14:30:45.000Z')
  })

  it('applies a timezone offset', () => {
    // 14:30 in UTC-3 is 17:30 UTC.
    expect(parseDateWithFormat('12/07/2026 14:30', 'DD/MM/YYYY HH:mm', -180)).toBe('2026-07-12T17:30:00.000Z')
  })

  it('rejects an invalid calendar date (Feb 31)', () => {
    expect(parseDateWithFormat('31/02/2026', 'DD/MM/YYYY')).toBeNull()
  })

  it('rejects a value that does not match the format', () => {
    expect(parseDateWithFormat('2026-07-12', 'DD/MM/YYYY')).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(parseDateWithFormat('', 'YYYY-MM-DD')).toBeNull()
  })

  it('rejects a malformed ISO string', () => {
    expect(parseDateWithFormat('not-a-date', 'ISO')).toBeNull()
  })
})

describe('isAmbiguousSlashDate', () => {
  it('flags a date where day and month could be swapped', () => {
    expect(isAmbiguousSlashDate('03/04/2026')).toBe(true)
  })

  it('does not flag a date where the day exceeds 12', () => {
    expect(isAmbiguousSlashDate('25/04/2026')).toBe(false)
  })

  it('does not flag a date with an already-unambiguous non-slash format', () => {
    expect(isAmbiguousSlashDate('2026-04-25')).toBe(false)
  })
})

describe('sanitizeCsvTextField', () => {
  it('prefixes a value starting with =', () => {
    expect(sanitizeCsvTextField('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
  })

  it('prefixes a value starting with +', () => {
    expect(sanitizeCsvTextField('+1234')).toBe("'+1234")
  })

  it('prefixes a value starting with -', () => {
    expect(sanitizeCsvTextField('-cmd')).toBe("'-cmd")
  })

  it('prefixes a value starting with @', () => {
    expect(sanitizeCsvTextField('@import')).toBe("'@import")
  })

  it('leaves a normal value untouched', () => {
    expect(sanitizeCsvTextField('csv_import')).toBe('csv_import')
  })

  it('leaves an empty string untouched', () => {
    expect(sanitizeCsvTextField('')).toBe('')
  })
})
