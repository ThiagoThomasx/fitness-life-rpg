"use client"

import { useState } from "react"
import Link from "next/link"
import type { CoachRecommendation } from "@/lib/coach/types"
import { buildExplanation } from "@/lib/coach/explanations"
import { isProposalActionable } from "@/lib/adaptive-planning/proposal-builder"
import { buildProposalsForRecommendation } from "@/lib/adaptive-planning/coach-proposals"
import { saveAdaptivePlanProposal } from "@/lib/adaptive-planning/storage"
import { acceptProposal, rejectProposal, reviewProposalLater } from "@/lib/adaptive-planning/decisions"
import { applyProposal } from "@/lib/adaptive-planning/execution"
import type { AdaptivePlanProposal } from "@/lib/adaptive-planning/types"
import { CATEGORY_LABELS, STATUS_LABELS, actionHref, priorityBadgeClass, statusBadgeClass } from "./coach-ui"
import { ProposalReviewModal } from "./ProposalReviewModal"

type CoachRecommendationCardProps = {
  recommendation: CoachRecommendation
  onDecide: (id: string, status: "visualizada" | "ignorada" | "aceita") => void
  /** Chamado depois de aceitar/rejeitar/revisar depois uma proposta — deixa a seção pai atualizar "Ajustes recentes". */
  onProposalChange?: () => void
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
export function CoachRecommendationCard({ recommendation, onDecide, onProposalChange }: CoachRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [reviewProposals, setReviewProposals] = useState<AdaptivePlanProposal[] | null>(null)
  const [proposalMessage, setProposalMessage] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const explanation = buildExplanation(recommendation)
  const decided = recommendation.status === "aceita" || recommendation.status === "ignorada"
  const isHealthBased = recommendation.ruleId.startsWith("Coach.Health.")

  function handleToggle() {
    const next = !expanded
    setExpanded(next)
    if (next && recommendation.status === "nova") {
      onDecide(recommendation.id, "visualizada")
    }
  }

  function handleCreateProposal() {
    const proposals = buildProposalsForRecommendation(recommendation)
    if (proposals.length === 0) {
      setProposalMessage("Nenhuma proposta automática disponível agora — sem sessão pendente no Planner para aplicar esta mudança.")
      return
    }
    proposals.forEach((proposal) => saveAdaptivePlanProposal(proposal))
    setProposalMessage(null)
    setApplyError(null)
    setReviewProposals(proposals)
  }

  function handleAcceptProposal(proposal: AdaptivePlanProposal) {
    const now = new Date()
    acceptProposal(proposal.id, now)
    const result = applyProposal(proposal.id, now)
    if (result.success) {
      setReviewProposals(null)
      setApplyError(null)
      onProposalChange?.()
    } else {
      setApplyError(result.error ?? "Não foi possível aplicar a proposta.")
    }
  }

  function handleRejectProposal(proposal: AdaptivePlanProposal) {
    rejectProposal(proposal.id, new Date())
    setReviewProposals(null)
    onProposalChange?.()
  }

  function handleReviewProposalLater(proposal: AdaptivePlanProposal) {
    reviewProposalLater(proposal.id, new Date())
    setReviewProposals(null)
    onProposalChange?.()
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
      {isHealthBased && (
        <span className="text-xs text-muted" style={{ fontStyle: "italic" }}>
          Baseado em dados de saúde
        </span>
      )}

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

          {isHealthBased && (
            <p className="text-xs text-muted" style={{ fontStyle: "italic" }}>
              Esses sinais são informativos e não substituem avaliação profissional.
            </p>
          )}

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
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => onDecide(recommendation.id, "aceita")}>
                Aceitar
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDecide(recommendation.id, "ignorada")}>
                Ignorar
              </button>
              {isProposalActionable(recommendation) && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={handleCreateProposal}>
                  Criar proposta
                </button>
              )}
            </div>
          )}

          {proposalMessage && (
            <p role="status" className="text-xs text-muted">
              {proposalMessage}
            </p>
          )}
        </div>
      )}

      {reviewProposals && (
        <ProposalReviewModal
          proposals={reviewProposals}
          applyError={applyError}
          onClose={() => setReviewProposals(null)}
          onAccept={handleAcceptProposal}
          onReject={handleRejectProposal}
          onReviewLater={handleReviewProposalLater}
        />
      )}
    </div>
  )
}
