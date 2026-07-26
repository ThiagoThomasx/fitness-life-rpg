// Data Usage Explainability — Sprint 29 Parte 3. Traduz o `HealthContext` de
// hoje (mesmo objeto que Readiness/Recovery/Fatigue/Coach efetivamente
// consomem — ver `consumer-context.ts`) para uma forma explicável na UI: por
// sinal, foi usado ou bloqueado, e por quê. Não reimplementa a lógica de
// gating — só lê `HealthMetricSignal.reliable`/`reasons`, já calculados.

import { buildHealthContext } from './consumer-context'
import type { HealthMetricSignal } from './consumer-context'
import type { AnalyticsPeriod } from '../analytics/types'

export type HealthDataUsageSignalKey = 'sleepMinutes' | 'restingHeartRate' | 'steps' | 'activityMinutes'

export interface HealthDataUsageSignal {
  key: HealthDataUsageSignalKey
  label: string
  hasData: boolean
  used: boolean
  reasons: string[]
  value?: number
}

export interface HealthDataUsageExplainability {
  date: string
  hasSufficientData: boolean
  signals: HealthDataUsageSignal[]
  /** Motores que efetivamente leem este `HealthContext` — sempre a mesma lista, ver `HEALTH-DATA-CONSUMERS.md`. */
  consumers: readonly string[]
}

const SIGNAL_LABELS: Record<HealthDataUsageSignalKey, string> = {
  sleepMinutes: 'Sono',
  restingHeartRate: 'FC de repouso',
  steps: 'Passos',
  activityMinutes: 'Atividade externa',
}

const SIGNAL_KEYS: readonly HealthDataUsageSignalKey[] = ['sleepMinutes', 'restingHeartRate', 'steps', 'activityMinutes']

const CONSUMERS = ['Readiness', 'Recovery', 'Fatigue', 'Coach'] as const

function buildSignal(key: HealthDataUsageSignalKey, signal: HealthMetricSignal | undefined): HealthDataUsageSignal {
  if (!signal) {
    return {
      key,
      label: SIGNAL_LABELS[key],
      hasData: false,
      used: false,
      reasons: ['Nenhum registro para esta métrica hoje.'],
    }
  }
  return {
    key,
    label: SIGNAL_LABELS[key],
    hasData: true,
    used: signal.reliable,
    reasons: signal.reasons,
    value: signal.value,
  }
}

/**
 * Explica, para o dia de `now`, quais sinais de saúde estão sendo
 * efetivamente usados pelos motores consumidores e quais foram bloqueados
 * (e por quê) — seção "Como seus dados foram utilizados" do brief.
 */
export function buildHealthDataUsageExplainability(
  period: AnalyticsPeriod = '30d',
  now: Date = new Date()
): HealthDataUsageExplainability {
  const dateKey = now.toISOString().slice(0, 10)
  const context = buildHealthContext(dateKey, period, now)

  return {
    date: context.date,
    hasSufficientData: context.hasSufficientData,
    signals: SIGNAL_KEYS.map((key) => buildSignal(key, context[key])),
    consumers: CONSUMERS,
  }
}
