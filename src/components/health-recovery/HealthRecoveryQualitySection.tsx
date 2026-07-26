"use client"

import type { HealthRecoveryQualityBreakdown } from "@/lib/health-data"

type Props = {
  quality: HealthRecoveryQualityBreakdown
}

const LEVEL_LABELS: Record<"high" | "medium" | "low" | "unknown", string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  unknown: "Desconhecida",
}

const LEVEL_BADGE: Record<"high" | "medium" | "low" | "unknown", string> = {
  high: "badge-pill badge-pill--accent",
  medium: "badge-pill badge-pill--level",
  low: "badge-pill badge-pill--danger",
  unknown: "badge-pill badge-pill--level",
}

/**
 * Distribuição de qualidade por dia no período — nunca um score numérico
 * único (regra explícita da Sprint 29, seção 27).
 */
export function HealthRecoveryQualitySection({ quality }: Props) {
  const levels: ("high" | "medium" | "low" | "unknown")[] = ["high", "medium", "low", "unknown"]

  return (
    <section className="card" aria-labelledby="health-quality-title">
      <h3 id="health-quality-title" className="section-label settings-section__title">
        Qualidade dos dados
      </h3>
      {quality.daysWithData === 0 ? (
        <p className="text-sm text-muted">Sem dias com dado de saúde no período selecionado.</p>
      ) : (
        <>
          <p className="text-sm text-secondary" style={{ marginBottom: "var(--space-2)" }}>
            {quality.daysWithData} dia(s) com ao menos um registro no período.
          </p>
          <div className="flex flex-wrap gap-2">
            {levels.map((level) =>
              quality[level] > 0 ? (
                <span key={level} className={LEVEL_BADGE[level]}>
                  {LEVEL_LABELS[level]}: {quality[level]} dia(s)
                </span>
              ) : null
            )}
          </div>
        </>
      )}
    </section>
  )
}
