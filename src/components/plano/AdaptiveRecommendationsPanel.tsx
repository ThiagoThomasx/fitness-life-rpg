"use client"

import { useState } from "react"
import type { AdaptivePlanRecommendation } from "@/lib/adaptive-recommendations"
import { recordRecommendationDecision } from "@/lib/adaptive-recommendation-decisions"

const SEVERITY_LABELS: Record<AdaptivePlanRecommendation["severity"], string> = {
  info: "Informativo",
  attention: "Atenção",
  important: "Importante",
}

const SEVERITY_BADGE: Record<AdaptivePlanRecommendation["severity"], string> = {
  info: "badge-pill--level",
  attention: "badge-pill--level",
  important: "badge-pill--accent",
}

type AdaptiveRecommendationsPanelProps = {
  recommendations: AdaptivePlanRecommendation[]
  onDecided: (recommendationId: string) => void
}

/**
 * Sprint 21 Parte 4A — nunca altera o programa sozinha (seção 15 da spec).
 * "Aceitar" só registra a decisão; qualquer mudança real continua manual,
 * feita pelo usuário no Planner ou no editor de programa.
 */
export function AdaptiveRecommendationsPanel({ recommendations, onDecided }: AdaptiveRecommendationsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (recommendations.length === 0) return null

  function decide(rec: AdaptivePlanRecommendation, status: "accepted" | "dismissed" | "review_later") {
    recordRecommendationDecision(rec.id, rec.type, status)
    onDecided(rec.id)
  }

  return (
    <section className="card" aria-labelledby="adaptive-recommendations-title">
      <h3 id="adaptive-recommendations-title" className="section-label">💡 Recomendações</h3>
      <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
        Orientações do aplicativo, não prescrição médica ou profissional.
      </p>

      <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
        {recommendations.map((rec) => {
          const isExpanded = expandedId === rec.id
          return (
            <div key={rec.id} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{rec.title}</span>
                <span className={`badge-pill ${SEVERITY_BADGE[rec.severity]}`}>{SEVERITY_LABELS[rec.severity]}</span>
              </div>
              <p className="text-xs text-secondary" style={{ marginTop: "var(--space-1)" }}>{rec.explanation}</p>

              <button
                type="button"
                className="text-xs text-muted"
                style={{ marginTop: "var(--space-1)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
              >
                {isExpanded ? "Ocultar evidências" : "Ver evidências"}
              </button>

              {isExpanded && (
                <ul className="text-xs text-muted" style={{ marginTop: "var(--space-1)", paddingLeft: "var(--space-4)" }}>
                  {rec.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2" style={{ marginTop: "var(--space-2)" }}>
                <button type="button" className="btn btn--primary" style={{ fontSize: "var(--text-xs)" }} onClick={() => decide(rec, "accepted")}>
                  Aceitar
                </button>
                <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => decide(rec, "review_later")}>
                  Revisar depois
                </button>
                <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => decide(rec, "dismissed")}>
                  Dispensar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
