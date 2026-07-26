// Mock Health Provider — Sprint 29 Parte 1. Prova que a interface
// `HealthDataProvider` e a pipeline de importação funcionam de ponta a ponta,
// sem depender de nenhum SDK nativo real. NUNCA deve ser exibido ao usuário
// final como uma integração real — é uma ferramenta de arquitetura/teste.

import type {
  HealthDataProvider,
  HealthPermissionResult,
  HealthProviderQuery,
  HealthProviderReadResult,
} from './provider'
import type { HealthMetricType, NewHealthDataRecordInput } from './types'

export interface MockHealthProviderOptions {
  /** Simula o provider indisponível (ex.: ambiente sem bridge nativo). Padrão `true`. */
  available?: boolean
  /** Métricas que o usuário concede quando `requestPermissions` é chamado. Padrão: todas as solicitadas. */
  metricsToGrant?: HealthMetricType[]
  /** Quando `true`, `readRecords` retorna `{ ok: false }` com uma mensagem de erro simulada. */
  simulateReadError?: boolean
  /** Quando `true`, cada chamada a `readRecords` devolve os mesmos registros (mesmo `externalId`) — simula duplicidade entre leituras. */
  simulateDuplicateReads?: boolean
  /** Gerador de dados sintéticos. Recebe a métrica e a janela pedida, devolve um valor plausível. */
  syntheticValue?: (metric: HealthMetricType) => number
}

const DEFAULT_SYNTHETIC_VALUES: Record<HealthMetricType, number> = {
  steps: 8200,
  sleep_duration: 420,
  sleep_quality: 4,
  resting_heart_rate: 58,
  weight: 78,
  active_calories: 380,
  activity_duration: 45,
  distance: 5.2,
  wellness_energy: 4,
  wellness_soreness: 2,
  wellness_motivation: 4,
}

function daysBetween(sinceIso: string, untilIso: string): number {
  const since = new Date(sinceIso).getTime()
  const until = new Date(untilIso).getTime()
  return Math.max(1, Math.round((until - since) / 86_400_000))
}

/**
 * Provider sintético que implementa `HealthDataProvider` completamente,
 * incluindo permissão parcial, erro simulado e leitura duplicada — para que
 * `provider-import.ts` (a ponte com a pipeline real) possa ser testado sem
 * nenhuma dependência nativa.
 */
export class MockHealthProvider implements HealthDataProvider {
  readonly id = 'mock'
  readonly name = 'Mock Health Provider (teste interno)'

  private readonly options: MockHealthProviderOptions
  private grantedMetrics: HealthMetricType[] = []

  constructor(options: MockHealthProviderOptions = {}) {
    this.options = options
  }

  async isAvailable(): Promise<boolean> {
    return this.options.available ?? true
  }

  async requestPermissions(metrics: HealthMetricType[]): Promise<HealthPermissionResult> {
    const grantable = this.options.metricsToGrant ?? metrics
    const granted = metrics.filter((m) => grantable.includes(m))
    const denied = metrics.filter((m) => !granted.includes(m))
    this.grantedMetrics = granted
    return { granted, denied }
  }

  async revokePermissions(): Promise<void> {
    this.grantedMetrics = []
  }

  async readRecords(query: HealthProviderQuery): Promise<HealthProviderReadResult> {
    if (this.options.simulateReadError) {
      return { ok: false, records: [], error: 'Falha simulada de leitura do provider mock.' }
    }

    const readableMetrics = query.metrics.filter((m) => this.grantedMetrics.includes(m))
    if (readableMetrics.length === 0) {
      return { ok: true, records: [] }
    }

    const days = this.options.simulateDuplicateReads ? 1 : daysBetween(query.since, query.until)
    const records: NewHealthDataRecordInput[] = []

    for (const metric of readableMetrics) {
      const value = (this.options.syntheticValue ?? ((m: HealthMetricType) => DEFAULT_SYNTHETIC_VALUES[m]))(metric)
      for (let day = 0; day < days; day++) {
        const recordedAt = new Date(new Date(query.since).getTime() + day * 86_400_000).toISOString()
        records.push({
          metric,
          value,
          recordedAt,
          source: 'health_connect',
          externalId: this.options.simulateDuplicateReads ? `mock-${metric}-fixed` : `mock-${metric}-${day}`,
        })
      }
    }

    return { ok: true, records }
  }
}
