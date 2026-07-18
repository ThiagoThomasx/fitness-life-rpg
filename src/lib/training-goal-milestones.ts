// Registro histórico de marcos de meta — Sprint 18.
// O motor de progresso (`training-goal-progress.ts`) calcula percentuais a cada
// leitura, mas SÓ este módulo decide se um marco já foi "batido" — uma vez
// registrado, o marco permanece mesmo que o valor atual caia depois
// (ex.: um deload reduz a carga, mas o marco de 50% continua conquistado).

const MILESTONES_KEY = 'lrpg-fit:goal-milestones'

export const MILESTONE_PERCENTAGES = [25, 50, 75, 100] as const

export interface GoalMilestoneRecord {
  id: string
  goalId: string
  percentage: number
  reachedAt: string
}

function loadMilestones(): GoalMilestoneRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(MILESTONES_KEY)
    return raw ? (JSON.parse(raw) as GoalMilestoneRecord[]) : []
  } catch {
    return []
  }
}

function persistMilestones(records: GoalMilestoneRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MILESTONES_KEY, JSON.stringify(records))
  } catch {
    // Storage unavailable — silently skip
  }
}

function isValidMilestone(raw: unknown): raw is GoalMilestoneRecord {
  if (typeof raw !== 'object' || raw === null) return false
  const m = raw as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    m.id.length > 0 &&
    typeof m.goalId === 'string' &&
    m.goalId.length > 0 &&
    typeof m.percentage === 'number' &&
    typeof m.reachedAt === 'string'
  )
}

export function getMilestonesForGoal(goalId: string): GoalMilestoneRecord[] {
  return loadMilestones()
    .filter((m) => m.goalId === goalId)
    .sort((a, b) => a.percentage - b.percentage)
}

/**
 * Registra um marco como atingido, se ainda não estiver registrado para esta
 * meta+percentual (evita dupla contagem em leituras repetidas). Retorna o
 * registro novo, ou `null` se já existia.
 */
export function recordMilestoneReached(goalId: string, percentage: number): GoalMilestoneRecord | null {
  const existing = loadMilestones()
  const alreadyReached = existing.some((m) => m.goalId === goalId && m.percentage === percentage)
  if (alreadyReached) return null

  const record: GoalMilestoneRecord = {
    id: `milestone-${goalId}-${percentage}`,
    goalId,
    percentage,
    reachedAt: new Date().toISOString(),
  }
  persistMilestones([record, ...existing])
  return record
}

export function getAllMilestones(): GoalMilestoneRecord[] {
  return loadMilestones()
}

export function importMilestones(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadMilestones()
  const existingIds = new Set(existing.map((m) => m.id))
  let imported = 0
  let skipped = 0
  const toAdd: GoalMilestoneRecord[] = []

  for (const item of raw) {
    if (isValidMilestone(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistMilestones([...toAdd, ...existing])
  }
  return { imported, skipped }
}
