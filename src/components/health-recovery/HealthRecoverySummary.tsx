"use client"

import type { HealthRecoveryDashboard } from "@/lib/health-data"
import { formatMinutesAsHours } from "./health-recovery-ui"

type Props = {
  dashboard: HealthRecoveryDashboard
}

/**
 * Resumo geral no topo da página — só os valores mais recentes disponíveis,
 * sem score único (regra explícita da Sprint 29). Cada card linka a seção
 * correspondente na mesma página via âncora.
 */
export function HealthRecoverySummary({ dashboard }: Props) {
  const cells: { label: string; value: string; anchor: string }[] = [
    {
      label: "Sono (última noite)",
      value: dashboard.sleep.latestValue !== null ? formatMinutesAsHours(dashboard.sleep.latestValue) : "—",
      anchor: "#health-sleep_duration-title",
    },
    {
      label: "FC de repouso",
      value: dashboard.restingHeartRate.latestValue !== null ? `${Math.round(dashboard.restingHeartRate.latestValue)}bpm` : "—",
      anchor: "#health-resting_heart_rate-title",
    },
    {
      label: "Passos",
      value: dashboard.steps.latestValue !== null ? dashboard.steps.latestValue.toLocaleString("pt-BR") : "—",
      anchor: "#health-steps-title",
    },
    {
      label: "Peso",
      value: dashboard.weight.latestKg !== null ? `${dashboard.weight.latestKg}kg` : "—",
      anchor: "#health-weight-title",
    },
  ]

  return (
    <section className="card" aria-label="Resumo de saúde">
      <div className="stat-grid stat-grid--2" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {cells.map((cell) => (
          <a key={cell.label} href={cell.anchor} className="stat-cell" style={{ textDecoration: "none" }}>
            <div className="stat-cell__value numeric">{cell.value}</div>
            <div className="stat-cell__label">{cell.label}</div>
          </a>
        ))}
      </div>
    </section>
  )
}
