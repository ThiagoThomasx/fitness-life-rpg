// Persistência de decisões do Coach — Sprint 26 Parte 3.
//
// Mesma convenção de `adaptive-recommendation-decisions.ts`: só o ESTADO da
// decisão é persistido, nunca o resultado de um cálculo (regra "RECÁLCULO" da
// spec — o Coach sempre recalcula os sinais ao abrir o Dashboard; só a
// decisão do usuário sobrevive entre recálculos). "Nova" nunca é persistida —
// é o estado implícito de qualquer recomendação sem decisão registrada.
// "Expirada" também não é persistida diretamente — é derivada em
// `recommendations.ts` quando uma decisão "aceita" já passou do prazo (regra
// determinística, não um novo status gravável pelo usuário).

const DECISIONS_KEY = 'lrpg-fit:coach-decisions'

export type CoachDecisionStatus = 'visualizada' | 'ignorada' | 'aceita'

export interface CoachDecision {
  recommendationId: string
  status: CoachDecisionStatus
  decidedAt: string
}

function loadDecisions(): CoachDecision[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DECISIONS_KEY)
    return raw ? (JSON.parse(raw) as CoachDecision[]) : []
  } catch {
    return []
  }
}

function persistDecisions(decisions: CoachDecision[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions))
  } catch {
    // Storage indisponível — ignora silenciosamente, mesma convenção do resto do app.
  }
}

export function getCoachDecisions(): CoachDecision[] {
  return loadDecisions()
}

/** Idempotente: decidir de novo sobre o mesmo id substitui a decisão anterior em vez de empilhar. */
export function recordCoachDecision(recommendationId: string, status: CoachDecisionStatus): CoachDecision {
  const decisions = loadDecisions().filter((d) => d.recommendationId !== recommendationId)
  const decision: CoachDecision = { recommendationId, status, decidedAt: new Date().toISOString() }
  persistDecisions([...decisions, decision])
  return decision
}

export function resetCoachDecisions(): void {
  persistDecisions([])
}
