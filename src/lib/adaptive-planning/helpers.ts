// Helpers compartilhados do domínio Adaptive Planning (Sprint 27 Parte 1).

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildProposalId(recommendationId: string): string {
  return `adp-${recommendationId}-${uniqueSuffix()}`
}

export function buildAuditEntryId(): string {
  return `adp-audit-${uniqueSuffix()}`
}

/** Séries mínimas por exercício — nunca reduzir um exercício a zero via proposta automática. */
export const MIN_SETS_PER_EXERCISE = 1
