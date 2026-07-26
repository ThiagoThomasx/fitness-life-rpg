"use client"

import { useId, useMemo, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import { formatChangesAsText } from "@/lib/adaptive-planning/proposal-diff"
import { previewProposalApplicability } from "@/lib/adaptive-planning/execution"
import type { AdaptivePlanProposal } from "@/lib/adaptive-planning/types"

type ProposalReviewModalProps = {
  proposals: AdaptivePlanProposal[]
  /** Erro da última tentativa de aplicar (se houve) — mostrado sem fechar o modal. */
  applyError?: string | null
  onClose: () => void
  onAccept: (proposal: AdaptivePlanProposal) => void
  onReject: (proposal: AdaptivePlanProposal) => void
  onReviewLater: (proposal: AdaptivePlanProposal) => void
}

/**
 * Review flow do Adaptive Planning (Sprint 27 Parte 4): mostra antes/depois +
 * avisos ANTES do usuário decidir (`previewProposalApplicability` — nunca
 * muta nada). Quando há mais de uma opção (ex.: `insert_recovery` com 3
 * alternativas), o usuário escolhe qual revisar — nenhuma é pré-selecionada
 * automaticamente como "a certa".
 */
export function ProposalReviewModal({ proposals, applyError, onClose, onAccept, onReject, onReviewLater }: ProposalReviewModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [selectedIndex, setSelectedIndex] = useState(0)

  const proposal = proposals[selectedIndex]
  const changeLines = useMemo(() => formatChangesAsText(proposal.changes), [proposal])
  const applicability = useMemo(() => previewProposalApplicability(proposal), [proposal])

  return (
    <ModalShell labelledBy={titleId} describedBy={descriptionId} onClose={onClose}>
      <h3 id={titleId} className="text-sm font-semibold text-primary">
        {proposal.title}
      </h3>
      <p id={descriptionId} className="text-xs text-muted">
        {proposal.summary}
      </p>

      {proposals.length > 1 && (
        <div className="flex flex-wrap gap-2" style={{ marginTop: "var(--space-2)" }}>
          {proposals.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={index === selectedIndex ? "btn btn--secondary btn--sm" : "btn btn--ghost btn--sm"}
              aria-pressed={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
            >
              {option.title}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: "var(--space-3)" }}>
        <div className="text-xs font-semibold text-muted">Antes / Depois</div>
        {changeLines.length > 0 ? (
          <ul className="text-xs text-muted" style={{ paddingLeft: "var(--space-4)" }}>
            {changeLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">Nenhuma alteração — o plano permanece igual.</p>
        )}
      </div>

      {proposal.evidence.length > 0 && (
        <div style={{ marginTop: "var(--space-2)" }}>
          <div className="text-xs font-semibold text-muted">Evidências</div>
          <ul className="text-xs text-muted" style={{ paddingLeft: "var(--space-4)" }}>
            {proposal.evidence.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {applicability.warnings.length > 0 && (
        <div role="status" className="text-xs" style={{ marginTop: "var(--space-2)", color: "var(--color-warning, #d9822b)" }}>
          {applicability.warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </div>
      )}

      {!applicability.applicable && (
        <div role="status" className="text-xs" style={{ marginTop: "var(--space-2)", color: "var(--color-danger, #d64545)" }}>
          {applicability.reasons.map((reason, i) => (
            <p key={i}>{reason}</p>
          ))}
        </div>
      )}

      {applyError && (
        <p role="status" className="text-xs" style={{ marginTop: "var(--space-2)", color: "var(--color-danger, #d64545)" }}>
          {applyError}
        </p>
      )}

      <div className="flex flex-wrap gap-2" style={{ marginTop: "var(--space-3)" }}>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!applicability.applicable}
          onClick={() => onAccept(proposal)}
        >
          Aceitar e aplicar
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReject(proposal)}>
          Rejeitar
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReviewLater(proposal)}>
          Revisar depois
        </button>
      </div>
    </ModalShell>
  )
}
