import { describe, it, expect } from 'vitest'
import { parseCsvText } from './csv-parser'

describe('parseCsvText', () => {
  it('parses a simple comma-delimited file', () => {
    const result = parseCsvText('metric,value,recordedAt\nsteps,8000,2026-07-26T10:00:00.000Z')
    expect(result.header).toEqual(['metric', 'value', 'recordedAt'])
    expect(result.rows).toEqual([['steps', '8000', '2026-07-26T10:00:00.000Z']])
  })

  it('strips a UTF-8 BOM from the start of the file', () => {
    const result = parseCsvText('﻿metric,value\nsteps,8000')
    expect(result.header[0]).toBe('metric')
  })

  it('handles Windows (CRLF) line endings', () => {
    const result = parseCsvText('metric,value\r\nsteps,8000\r\nweight,80')
    expect(result.rows).toHaveLength(2)
  })

  it('skips blank lines', () => {
    const result = parseCsvText('metric,value\n\nsteps,8000\n\n')
    expect(result.rows).toHaveLength(1)
  })

  it('detects a semicolon delimiter when it dominates the header', () => {
    const result = parseCsvText('metric;value;recordedAt\nsteps;8000;2026-07-26T10:00:00.000Z')
    expect(result.header).toEqual(['metric', 'value', 'recordedAt'])
  })

  it('handles quoted fields containing the delimiter', () => {
    const result = parseCsvText('metric,value,notes\nsteps,8000,"contains, a comma"')
    expect(result.rows[0]).toEqual(['steps', '8000', 'contains, a comma'])
  })

  it('handles escaped double quotes inside a quoted field', () => {
    const result = parseCsvText('metric,notes\nsteps,"she said ""hi"""')
    expect(result.rows[0][1]).toBe('she said "hi"')
  })

  it('returns empty header and rows for an empty string', () => {
    const result = parseCsvText('')
    expect(result.header).toEqual([])
    expect(result.rows).toEqual([])
  })

  it('trims whitespace around unquoted fields', () => {
    const result = parseCsvText('metric, value \nsteps , 8000')
    expect(result.header).toEqual(['metric', 'value'])
    expect(result.rows[0]).toEqual(['steps', '8000'])
  })
})
