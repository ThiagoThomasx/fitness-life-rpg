"use client"

import { METRIC_LABELS, type HealthDataConflict } from "@/lib/health-data"
import { CONFLICT_SEVERITY_LABELS, SOURCE_LABELS, conflictSeverityBadgeClass } from "./health-recovery-ui"

type Props = {
  conflicts: HealthDataConflict[]
}

/**
 * Lista de conflitos entre fontes no período — nunca resolvidos
 * automaticamente (regra explícita da Sprint 29, seção 26). A remoção
 * manual de um registro específico já existe no fluxo de "Dados de saúde"
 * em Configurações; esta seção só explica o que está em conflito e por quê.
 */
export function HealthRecoveryConflictsSection({ conflicts }: Props) {
  if (conflicts.length === 0) {
    return (
      <section className="card" aria-labelledby="health-conflicts-title">
        <h3 id="health-conflicts-title" className="section-label settings-section__title">
          Conflitos entre fontes
        </h3>
        <p className="text-sm text-muted">Nenhum conflito detectado no período selecionado.</p>
      </section>
    )
  }

  return (
    <section className="card" aria-labelledby="health-conflicts-title">
      <h3 id="health-conflicts-title" className="section-label settings-section__title">
        Conflitos entre fontes ({conflicts.length})
      </h3>
      <ul className="flex flex-col gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {conflicts.map((conflict, i) => (
          <li key={`${conflict.metric}-${conflict.date}-${i}`} className="stat-cell" style={{ textAlign: "left" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <strong className="text-sm text-primary">
                {METRIC_LABELS[conflict.metric]} · {conflict.date}
              </strong>
              <span className={conflictSeverityBadgeClass(conflict.severity)}>
                Severidade: {CONFLICT_SEVERITY_LABELS[conflict.severity]}
              </span>
            </div>
            <p className="text-xs text-muted" style={{ marginTop: "4px" }}>
              {conflict.reason} — fontes: {conflict.sources.map((s) => SOURCE_LABELS[s]).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
