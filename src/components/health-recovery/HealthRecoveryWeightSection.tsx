"use client"

import Link from "next/link"
import type { HealthRecoveryWeightView } from "@/lib/health-data"

type Props = {
  weight: HealthRecoveryWeightView
}

/**
 * Peso continua vindo de Body Progress (fonte de verdade única — ver
 * `body-progress-adapter.ts`). Aqui só consultamos o valor mais recente e
 * linkamos para o gráfico real, sem duplicar edição nem gráfico.
 */
export function HealthRecoveryWeightSection({ weight }: Props) {
  return (
    <section className="card" aria-labelledby="health-weight-title">
      <h3 id="health-weight-title" className="section-label settings-section__title">
        ⚖️ Peso
      </h3>
      {weight.latestKg === null ? (
        <p className="text-sm text-muted">Nenhum registro de peso em Progresso Corporal ainda.</p>
      ) : (
        <p className="text-sm text-secondary">
          Último registro: <strong className="numeric text-primary">{weight.latestKg}kg</strong> em{" "}
          {weight.latestDate} · {weight.sampleSize} registro(s) no total.
        </p>
      )}
      <Link href="/perfil" className="badge-pill badge-pill--accent" style={{ marginTop: "var(--space-2)", display: "inline-block" }}>
        Ver gráfico completo em Progresso Corporal
      </Link>
    </section>
  )
}
