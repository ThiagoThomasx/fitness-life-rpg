// Provider Abstraction — Sprint 29 Parte 1. Interface documentada para uma
// futura fonte externa (Health Connect, Samsung Health, Apple Health, Google
// Fit). Nenhum provider real é implementado nesta sprint — ver
// `docs/adr/ADR-HEALTH-PLATFORM.md` e `HEALTH-PROVIDER-INTERFACE.md`.
//
// Um provider NUNCA alimenta Readiness/Recovery/Fatigue/Coach diretamente.
// Seus registros sempre passam pela mesma pipeline usada por entrada manual e
// importação de arquivo: validação → normalização → deduplicação →
// persistência local (ver `provider-import.ts`).

import type { HealthMetricType, NewHealthDataRecordInput } from './types'

export interface HealthPermissionResult {
  granted: HealthMetricType[]
  denied: HealthMetricType[]
}

export interface HealthProviderQuery {
  metrics: HealthMetricType[]
  /** ISO timestamp, início do intervalo de leitura (inclusivo). */
  since: string
  /** ISO timestamp, fim do intervalo de leitura (inclusivo). */
  until: string
}

export interface HealthProviderReadResult {
  ok: boolean
  records: NewHealthDataRecordInput[]
  error?: string
}

/**
 * Contrato que qualquer fonte externa futura deve implementar. Providers reais
 * (Health Connect, HealthKit, etc.) exigem um wrapper nativo (ver ADR) — esta
 * interface existe para que o domínio `health-data` já esteja pronto para
 * recebê-los sem mudança estrutural quando essa decisão for tomada.
 */
export interface HealthDataProvider {
  id: string
  name: string

  /** `false` quando a plataforma/ambiente atual não suporta este provider (ex.: navegador sem bridge nativo). */
  isAvailable(): Promise<boolean>

  requestPermissions(metrics: HealthMetricType[]): Promise<HealthPermissionResult>

  readRecords(query: HealthProviderQuery): Promise<HealthProviderReadResult>

  revokePermissions?(): Promise<void>
}
