"use client"

import type { HealthTrainingRelationship } from "@/lib/health-data"

type Props = {
  relationships: HealthTrainingRelationship[]
}

/**
 * Relações saúde × treino — cada card descreve uma diferença observada
 * entre dois grupos, nunca causalidade (seção 18-20 do brief). Amostra
 * insuficiente é um estado explícito, não um card escondido.
 */
export function HealthRelationshipsSection({ relationships }: Props) {
  return (
    <section className="card" aria-labelledby="health-relationships-title">
      <h3 id="health-relationships-title" className="section-label settings-section__title">
        Saúde × treino
      </h3>
      <p className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
        Comparação entre dias com o sinal abaixo da linha de base e dias na linha de base ou acima — não implica
        causalidade.
      </p>
      <div className="flex flex-col gap-2">
        {relationships.map((r) => (
          <div key={r.id} className="stat-cell" style={{ textAlign: "left" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <strong className="text-sm text-primary">{r.label}</strong>
              <span className={r.sufficientSample ? "badge-pill badge-pill--accent" : "badge-pill badge-pill--level"}>
                {r.sufficientSample
                  ? `${r.belowBaseline.sampleSize} vs ${r.atOrAboveBaseline.sampleSize} dias`
                  : "Amostra insuficiente"}
              </span>
            </div>
            <p className="text-xs text-muted" style={{ marginTop: "4px" }}>{r.evidenceText}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
