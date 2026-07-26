import { describe, it, expect } from 'vitest'
import { buildHealthExportFilename } from './filenames'

const NOW = new Date('2026-07-26T12:00:00.000Z')

describe('buildHealthExportFilename', () => {
  it('uses "all" when no single metric is selected', () => {
    expect(buildHealthExportFilename('json', [], NOW)).toBe('fitness-life-rpg-health-all-2026-07-26.json')
  })

  it('uses "all" when more than one metric is selected', () => {
    expect(buildHealthExportFilename('csv', ['steps', 'weight'], NOW)).toBe('fitness-life-rpg-health-all-2026-07-26.csv')
  })

  it('uses the metric name (slugified) when exactly one metric is selected', () => {
    expect(buildHealthExportFilename('csv', ['steps'], NOW)).toBe('fitness-life-rpg-health-steps-2026-07-26.csv')
  })

  it('slugifies underscored metric names', () => {
    expect(buildHealthExportFilename('json', ['sleep_duration'], NOW)).toBe('fitness-life-rpg-health-sleep-duration-2026-07-26.json')
  })

  it('uses the correct extension per format', () => {
    expect(buildHealthExportFilename('json', ['weight'], NOW).endsWith('.json')).toBe(true)
    expect(buildHealthExportFilename('csv', ['weight'], NOW).endsWith('.csv')).toBe(true)
  })
})
