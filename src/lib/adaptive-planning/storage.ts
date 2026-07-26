// Persistência (Sprint 27 Parte 1).
//
// Mesmo padrão do resto do repositório: módulo `lib/*` + localStorage direto,
// sem Zustand (ver auditoria — Adaptive Planning não observa mudanças em
// tempo real o suficiente para justificar um store). Duas chaves: propostas
// (com decisão embutida no `status`) e audit trail (append-only).

import type { AdaptiveAuditEntry, AdaptivePlanProposal } from './types'

const PROPOSALS_KEY = 'lrpg-fit:adaptive-plan-proposals'
const AUDIT_KEY = 'lrpg-fit:adaptive-plan-audit'

// ─── Proposals ────────────────────────────────────────────────────────────────

function loadProposals(): AdaptivePlanProposal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PROPOSALS_KEY)
    return raw ? (JSON.parse(raw) as AdaptivePlanProposal[]) : []
  } catch {
    return []
  }
}

function persistProposals(proposals: AdaptivePlanProposal[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals))
  } catch {
    // Storage indisponível — falha silenciosa, mesmo padrão do resto do app.
  }
}

export function getAdaptivePlanProposals(): AdaptivePlanProposal[] {
  return loadProposals().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
}

export function getAdaptivePlanProposalById(id: string): AdaptivePlanProposal | null {
  return loadProposals().find((p) => p.id === id) ?? null
}

export function getAdaptivePlanProposalByRecommendationId(recommendationId: string): AdaptivePlanProposal | null {
  return loadProposals().find((p) => p.recommendationId === recommendationId) ?? null
}

export function saveAdaptivePlanProposal(proposal: AdaptivePlanProposal): AdaptivePlanProposal {
  const proposals = loadProposals()
  persistProposals([proposal, ...proposals])
  return proposal
}

export function updateAdaptivePlanProposal(
  id: string,
  patch: Partial<AdaptivePlanProposal>
): AdaptivePlanProposal | null {
  const proposals = loadProposals()
  const index = proposals.findIndex((p) => p.id === id)
  if (index === -1) return null

  const updated: AdaptivePlanProposal = { ...proposals[index], ...patch, id: proposals[index].id }
  const next = [...proposals]
  next[index] = updated
  persistProposals(next)
  return updated
}

export function resetAdaptivePlanProposals(): void {
  persistProposals([])
}

function isValidProposal(raw: unknown): raw is AdaptivePlanProposal {
  if (typeof raw !== 'object' || raw === null) return false
  const p = raw as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.recommendationId === 'string' &&
    typeof p.type === 'string' &&
    typeof p.status === 'string' &&
    typeof p.createdAt === 'string'
  )
}

export function importAdaptivePlanProposals(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadProposals()
  const existingIds = new Set(existing.map((p) => p.id))
  const toAdd: AdaptivePlanProposal[] = []
  let imported = 0
  let skipped = 0

  for (const item of raw) {
    if (isValidProposal(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistProposals([...toAdd, ...existing])
  }
  return { imported, skipped }
}

// ─── Audit trail ──────────────────────────────────────────────────────────────
// Append-only. Nunca editado nem removido por execução normal — só por reset.

function loadAuditTrail(): AdaptiveAuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY)
    return raw ? (JSON.parse(raw) as AdaptiveAuditEntry[]) : []
  } catch {
    return []
  }
}

function persistAuditTrail(entries: AdaptiveAuditEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(entries))
  } catch {
    // Storage indisponível — falha silenciosa.
  }
}

export function getAdaptivePlanAuditTrail(): AdaptiveAuditEntry[] {
  return loadAuditTrail().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
}

export function appendAdaptivePlanAuditEntry(entry: AdaptiveAuditEntry): AdaptiveAuditEntry {
  const entries = loadAuditTrail()
  persistAuditTrail([entry, ...entries])
  return entry
}

export function resetAdaptivePlanAuditTrail(): void {
  persistAuditTrail([])
}

function isValidAuditEntry(raw: unknown): raw is AdaptiveAuditEntry {
  if (typeof raw !== 'object' || raw === null) return false
  const e = raw as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    typeof e.proposalId === 'string' &&
    typeof e.action === 'string' &&
    typeof e.createdAt === 'string'
  )
}

export function importAdaptivePlanAuditTrail(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadAuditTrail()
  const existingIds = new Set(existing.map((e) => e.id))
  const toAdd: AdaptiveAuditEntry[] = []
  let imported = 0
  let skipped = 0

  for (const item of raw) {
    if (isValidAuditEntry(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistAuditTrail([...toAdd, ...existing])
  }
  return { imported, skipped }
}

/** Reset granular combinado — decisões/propostas/audit trail. Nunca reverte mudanças já aplicadas (elas já fazem parte do programa atual). */
export function resetAdaptivePlanning(): void {
  resetAdaptivePlanProposals()
  resetAdaptivePlanAuditTrail()
}
