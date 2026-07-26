"use client"

import type { AdaptiveAuditEntry } from "@/lib/adaptive-planning/types"

const ACTION_LABELS: Record<AdaptiveAuditEntry["action"], string> = {
  created: "Criada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  review_later: "Revisar depois",
  applied: "Aplicada",
  failed: "Falhou",
  expired: "Expirada",
}

function actionBadgeClass(action: AdaptiveAuditEntry["action"]): string {
  if (action === "applied") return "badge-pill badge-pill--accent"
  if (action === "failed" || action === "rejected") return "badge-pill badge-pill--danger"
  return "badge-pill badge-pill--level"
}

const MAX_VISIBLE = 5

type Props = {
  entries: AdaptiveAuditEntry[]
}

/**
 * "Ajustes recentes" (Fase 33 do spec) — lista compacta do audit trail do
 * Adaptive Planning. Nunca uma rota nova (mesma decisão de navegação
 * travada); só mais uma seção dentro do Coach. Status nunca comunicado só
 * por cor (badge sempre tem texto).
 */
export function RecentAdaptiveChangesSection({ entries }: Props) {
  if (entries.length === 0) return null

  const visible = entries.slice(0, MAX_VISIBLE)

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <div className="text-xs font-semibold text-muted" style={{ marginBottom: "var(--space-2)" }}>
        Ajustes recentes
      </div>
      <ul className="flex flex-col gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {visible.map((entry) => (
          <li key={entry.id} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs font-semibold text-primary">{entry.targetSummary}</span>
              <span className={actionBadgeClass(entry.action)}>{ACTION_LABELS[entry.action]}</span>
            </div>
            {entry.changesSummary.length > 0 && (
              <ul className="text-xs text-muted" style={{ paddingLeft: "var(--space-4)", marginTop: "var(--space-1)" }}>
                {entry.changesSummary.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
            {entry.errorMessage && <p className="text-xs text-muted">{entry.errorMessage}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
