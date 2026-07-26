import { describe, it, expect, beforeEach } from 'vitest'
import { MockHealthProvider } from './mock-provider'
import { importFromProvider } from './provider-import'
import { getHealthDataRecords } from './storage'

const QUERY = { metrics: ['steps' as const], since: '2026-07-20T00:00:00.000Z', until: '2026-07-21T00:00:00.000Z' }

beforeEach(() => {
  window.localStorage.clear()
})

describe('importFromProvider', () => {
  it('fails fast when the provider is unavailable', async () => {
    const provider = new MockHealthProvider({ available: false })
    const result = await importFromProvider(provider, QUERY)
    expect(result.ok).toBe(false)
    expect(result.appliedCount).toBe(0)
    expect(result.error).toContain('não está disponível')
  })

  it('surfaces a read error without touching storage', async () => {
    const provider = new MockHealthProvider({ simulateReadError: true })
    await provider.requestPermissions(['steps'])
    const result = await importFromProvider(provider, QUERY)
    expect(result.ok).toBe(false)
    expect(getHealthDataRecords()).toHaveLength(0)
  })

  it('persists provider records through the real import pipeline', async () => {
    const provider = new MockHealthProvider()
    await provider.requestPermissions(['steps'])
    const result = await importFromProvider(provider, QUERY)
    expect(result.ok).toBe(true)
    expect(result.appliedCount).toBe(1)
    expect(result.preview?.readyToImport).toBe(1)
    expect(getHealthDataRecords()).toHaveLength(1)
    expect(getHealthDataRecords()[0].source).toBe('health_connect')
  })

  it('deduplicates a second read of the same provider data via the existing pipeline', async () => {
    const provider = new MockHealthProvider({ simulateDuplicateReads: true })
    await provider.requestPermissions(['steps'])
    const first = await importFromProvider(provider, QUERY)
    const second = await importFromProvider(provider, QUERY)
    expect(first.appliedCount).toBe(1)
    expect(second.appliedCount).toBe(0)
    expect(second.preview?.duplicates).toBe(1)
    expect(getHealthDataRecords()).toHaveLength(1)
  })

  it('is a no-op with no error when permissions were denied for every requested metric', async () => {
    const provider = new MockHealthProvider({ metricsToGrant: [] })
    await provider.requestPermissions(['steps'])
    const result = await importFromProvider(provider, QUERY)
    expect(result.ok).toBe(true)
    expect(result.appliedCount).toBe(0)
    expect(getHealthDataRecords()).toHaveLength(0)
  })
})
