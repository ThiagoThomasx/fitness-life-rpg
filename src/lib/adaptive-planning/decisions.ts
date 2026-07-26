// Decisões do usuário sobre uma proposta (Sprint 27 Parte 4).
//
// Separado de `execution.ts` de propósito: decidir ("aceitar") e executar
// ("aplicar") são passos distintos no fluxo obrigatório da sprint —
// `build proposal → validate → preview → accept → execute → persist audit`.
// Só `applyProposal` (execution.ts) muta o programa/planner de verdade; tudo
// aqui só muda o `status` da própria proposta + audit trail.

import { appendAdaptivePlanAuditEntry, getAdaptivePlanProposalById, getAdaptivePlanProposals, updateAdaptivePlanProposal } from './storage'
import { buildAuditEntryId } from './helpers'
import { formatChangesAsText } from './proposal-diff'
import type { AdaptiveAuditAction, AdaptivePlanProposal } from './types'

function recordAudit(proposal: AdaptivePlanProposal, action: AdaptiveAuditAction, now: Date): void {
  appendAdaptivePlanAuditEntry({
    id: buildAuditEntryId(),
    proposalId: proposal.id,
    recommendationId: proposal.recommendationId,
    ruleId: proposal.ruleId,
    action,
    targetSummary: proposal.title,
    changesSummary: formatChangesAsText(proposal.changes),
    createdAt: now.toISOString(),
  })
}

const OPEN_STATUSES: ReadonlySet<AdaptivePlanProposal['status']> = new Set<AdaptivePlanProposal['status']>([
  'draft',
  'reviewing',
])

/** Aceita uma proposta ainda aberta (`draft`/`reviewing`) — NÃO aplica a mudança, só registra a aprovação explícita do usuário. */
export function acceptProposal(proposalId: string, now: Date = new Date()): AdaptivePlanProposal | null {
  const proposal = getAdaptivePlanProposalById(proposalId)
  if (!proposal || !OPEN_STATUSES.has(proposal.status)) return null

  const updated = updateAdaptivePlanProposal(proposalId, { status: 'accepted', reviewedAt: now.toISOString() })
  if (updated) recordAudit(updated, 'accepted', now)
  return updated
}

export function rejectProposal(proposalId: string, now: Date = new Date()): AdaptivePlanProposal | null {
  const proposal = getAdaptivePlanProposalById(proposalId)
  if (!proposal || !OPEN_STATUSES.has(proposal.status)) return null

  const updated = updateAdaptivePlanProposal(proposalId, { status: 'rejected', reviewedAt: now.toISOString() })
  if (updated) recordAudit(updated, 'rejected', now)
  return updated
}

/** "Revisar depois" (Fase 31) — mantém a proposta aberta em `reviewing`, só marca que o usuário já viu. */
export function reviewProposalLater(proposalId: string, now: Date = new Date()): AdaptivePlanProposal | null {
  const proposal = getAdaptivePlanProposalById(proposalId)
  if (!proposal || !OPEN_STATUSES.has(proposal.status)) return null

  const updated = updateAdaptivePlanProposal(proposalId, { status: 'reviewing', reviewedAt: now.toISOString() })
  if (updated) recordAudit(updated, 'review_later', now)
  return updated
}

/**
 * Varre propostas ainda abertas e expira as que passaram do prazo (Fase 25).
 * Nunca mexe em propostas já decididas (aceitas/rejeitadas/aplicadas) — só
 * `draft`/`reviewing` podem expirar.
 */
export function expireStaleProposals(now: Date = new Date()): number {
  const proposals = getAdaptivePlanProposals()
  let expiredCount = 0
  for (const proposal of proposals) {
    if (!OPEN_STATUSES.has(proposal.status)) continue
    if (!proposal.expiresAt || new Date(proposal.expiresAt).getTime() >= now.getTime()) continue

    const updated = updateAdaptivePlanProposal(proposal.id, { status: 'expired' })
    if (updated) {
      recordAudit(updated, 'expired', now)
      expiredCount++
    }
  }
  return expiredCount
}
