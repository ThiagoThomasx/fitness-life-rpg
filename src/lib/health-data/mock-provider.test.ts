import { describe, it, expect } from 'vitest'
import { MockHealthProvider } from './mock-provider'

describe('MockHealthProvider', () => {
  it('reports availability from options, defaulting to true', async () => {
    expect(await new MockHealthProvider().isAvailable()).toBe(true)
    expect(await new MockHealthProvider({ available: false }).isAvailable()).toBe(false)
  })

  it('grants all requested metrics by default', async () => {
    const provider = new MockHealthProvider()
    const result = await provider.requestPermissions(['steps', 'sleep_duration'])
    expect(result.granted).toEqual(['steps', 'sleep_duration'])
    expect(result.denied).toEqual([])
  })

  it('grants only the configured subset and denies the rest', async () => {
    const provider = new MockHealthProvider({ metricsToGrant: ['steps'] })
    const result = await provider.requestPermissions(['steps', 'sleep_duration'])
    expect(result.granted).toEqual(['steps'])
    expect(result.denied).toEqual(['sleep_duration'])
  })

  it('only reads metrics that were actually granted', async () => {
    const provider = new MockHealthProvider({ metricsToGrant: ['steps'] })
    await provider.requestPermissions(['steps', 'sleep_duration'])
    const result = await provider.readRecords({
      metrics: ['steps', 'sleep_duration'],
      since: '2026-07-20T00:00:00.000Z',
      until: '2026-07-21T00:00:00.000Z',
    })
    expect(result.ok).toBe(true)
    expect(result.records.every((r) => r.metric === 'steps')).toBe(true)
  })

  it('returns no records for metrics not yet permitted', async () => {
    const provider = new MockHealthProvider()
    const result = await provider.readRecords({
      metrics: ['steps'],
      since: '2026-07-20T00:00:00.000Z',
      until: '2026-07-21T00:00:00.000Z',
    })
    expect(result.ok).toBe(true)
    expect(result.records).toEqual([])
  })

  it('simulates a read error when configured', async () => {
    const provider = new MockHealthProvider({ simulateReadError: true })
    await provider.requestPermissions(['steps'])
    const result = await provider.readRecords({
      metrics: ['steps'],
      since: '2026-07-20T00:00:00.000Z',
      until: '2026-07-21T00:00:00.000Z',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('produces one record per day in the requested window', async () => {
    const provider = new MockHealthProvider()
    await provider.requestPermissions(['steps'])
    const result = await provider.readRecords({
      metrics: ['steps'],
      since: '2026-07-20T00:00:00.000Z',
      until: '2026-07-23T00:00:00.000Z',
    })
    expect(result.records).toHaveLength(3)
  })

  it('simulates duplicate reads by reusing the same externalId across calls', async () => {
    const provider = new MockHealthProvider({ simulateDuplicateReads: true })
    await provider.requestPermissions(['steps'])
    const query = { metrics: ['steps' as const], since: '2026-07-20T00:00:00.000Z', until: '2026-07-25T00:00:00.000Z' }
    const first = await provider.readRecords(query)
    const second = await provider.readRecords(query)
    expect(first.records[0].externalId).toBe(second.records[0].externalId)
  })

  it('clears granted metrics on revoke', async () => {
    const provider = new MockHealthProvider()
    await provider.requestPermissions(['steps'])
    await provider.revokePermissions?.()
    const result = await provider.readRecords({
      metrics: ['steps'],
      since: '2026-07-20T00:00:00.000Z',
      until: '2026-07-21T00:00:00.000Z',
    })
    expect(result.records).toEqual([])
  })

  it('uses a custom synthetic value generator when provided', async () => {
    const provider = new MockHealthProvider({ syntheticValue: () => 12345 })
    await provider.requestPermissions(['steps'])
    const result = await provider.readRecords({
      metrics: ['steps'],
      since: '2026-07-20T00:00:00.000Z',
      until: '2026-07-21T00:00:00.000Z',
    })
    expect(result.records[0].value).toBe(12345)
  })
})
