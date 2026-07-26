"use client"

import { useState } from "react"
import Link from "next/link"
import type { CoachRecommendation } from "@/lib/coach/types"
import { buildExplanation } from "@/lib/coach/explanations"
import { CATEGORY_LABELS, STATUS_LABELS, actionHref, priorityBadgeClass, statusBadgeClass } from "./coach-ui"

type CoachRecommendationCardProps = {
  recommendation: CoachRecommendation
  onDecide: (id: string, status: "visualizada" | "ignorada" | "aceita") => void
}

/**
 * Card independente por recomendação (regra "LAYOUT" da spec — nunca uma
 * lista compacta). Colapsado mostra só título/resumo/badges; "Ver detalhes"
 * expande a explicação completa (regra "EXPLICAÇÃO": título, resumo,
 * evidências, período, regra aplicada, sugestão) e marca a recomendação como
 * "visualizada" na primeira expansão — nunca aplica nenhuma mudança
 * automática (regra "NÃO IMPLEMENTAR"), só ações de navegação e a decisão
 * explícita do usuário via os botões Aceitar/Ignorar.
 */
export function CoachRecommendationCard({ recommendation, onDecide }: CoachRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const explanation = buildExplanation(recommendation)
  const decided = recommendation.status === "aceita" || recommendation.status === "ignorada"

  function handleToggle() {
    const next = !expanded
    setExpanded(next)
    if (next && recommendation.status === "nova") {
      onDecide(recommendation.id, "visualizada")
    }
  }

  return (
    <div
      className="target-card"
      style={{ textAlign: "left", cursor: "default", opacity: recommendation.status === "ignorada" ? 0.6 : 1 }}
    >
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-sm font-semibold text-primary">{recommendation.title}</span>
        <div className="flex items-center gap-1">
          <span className={priorityBadgeClass(recommendation.priority)}>{CATEGORY_LABELS[recommendation.category]}</span>
          <span className={statusBadgeClass(recommendation.status)}>{STATUS_LABELS[recommendation.status]}</span>
        </div>
      </div>
      <p className="text-xs text-muted">{recommendation.summary}</p>

      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={handleToggle}
        aria-expanded={expanded}
        style={{ marginTop: "var(--space-2)" }}
      >
        {expanded ? "Ocultar detalhes" : "Ver detalhes"}
      </button>

      {expanded && (
        <div style={{ marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div>
            <div className="text-xs font-semibold text-muted">Evidências</div>
            <ul className="text-xs text-muted" style={{ paddingLeft: "var(--space-4)" }}>
              {explanation.evidence.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-muted">
            <strong className="text-primary">Período analisado:</strong> {explanation.periodAnalyzed}
          </div>
          <div className="text-xs text-muted">
            <strong className="text-primary">Regra aplicada:</strong> {explanation.ruleApplied}
          </div>
          <div className="text-xs text-muted">
            <strong className="text-primary">Sugestão:</strong> {explanation.suggestion}
          </div>

          {recommendation.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recommendation.actions.map((action, i) => (
                <Link key={i} href={actionHref(action.kind, action.id)} className="btn btn--secondary btn--sm no-underline">
                  {action.label}
                </Link>
              ))}
            </div>
          )}

          {!decided && (
            <div className="flex gap-2">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => onDecide(recommendation.id, "aceita")}>
                Aceitar
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDecide(recommendation.id, "ignorada")}>
                Ignorar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
