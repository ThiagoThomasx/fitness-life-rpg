"use client"

import type { HealthDataUsageExplainability } from "@/lib/health-data"

type Props = {
  usage: HealthDataUsageExplainability
}

/**
 * "Como seus dados foram utilizados" — traduz o mesmo `HealthContext` que
 * Readiness/Recovery/Fatigue/Coach consomem (seção 21-22 do brief). Não
 * reimplementa gating: só exibe `used`/`reasons` já calculados por
 * `data-usage.ts`.
 */
export function HealthDataUsageSection({ usage }: Props) {
  return (
    <section className="card" aria-labelledby="health-data-usage-title">
      <h3 id="health-data-usage-title" className="section-label settings-section__title">
        Como seus dados foram utilizados hoje
      </h3>
      <p className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
        Readiness, Recovery, Fatigue e Coach leem o mesmo contexto de saúde do dia — quando um sinal é bloqueado
        aqui, nenhum desses motores o utiliza.
      </p>
      <ul className="flex flex-col gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {usage.signals.map((signal) => (
          <li key={signal.key} className="stat-cell" style={{ textAlign: "left" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <strong className="text-sm text-primary">{signal.label}</strong>
              <span className={signal.used ? "badge-pill badge-pill--accent" : "badge-pill badge-pill--level"}>
                {signal.used ? "Utilizado" : "Não utilizado"}
              </span>
            </div>
            {signal.reasons.length > 0 && (
              <p className="text-xs text-muted" style={{ marginTop: "4px" }}>
                Motivo: {signal.reasons.join(" ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
