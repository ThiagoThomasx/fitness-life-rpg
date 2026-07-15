// Registro de alterações manuais em sessões: pular, reagendar, restaurar.
// Armazenado em `lrpg-fit:session-plan-changes`.
// Só persiste o que não pode ser derivado do histórico concluído.

const STORAGE_KEY = 'lrpg-fit:session-plan-changes'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionChangeType = 'skip' | 'reschedule' | 'restore'

export interface SessionPlanChange {
  id: string
  workoutId: string
  workoutName: string
  type: SessionChangeType
  weekStart: string
  createdAt: string
  fromDate?: string
  toDate?: string
  note?: string
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load(): SessionPlanChange[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SessionPlanChange[]) : []
  } catch {
    return []
  }
}

function persist(changes: SessionPlanChange[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(changes))
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSessionPlanChanges(): SessionPlanChange[] {
  return load()
}

export function getChangesForWeek(weekStart: string): SessionPlanChange[] {
  return load().filter((c) => c.weekStart === weekStart)
}

export function skipSession(
  workoutId: string,
  workoutName: string,
  weekStart: string,
  note?: string
): SessionPlanChange {
  const changes = load()
  const existing = changes.find(
    (c) => c.workoutId === workoutId && c.weekStart === weekStart && c.type === 'skip'
  )
  if (existing) return existing

  const change: SessionPlanChange = {
    id: `spc-${Date.now()}`,
    workoutId,
    workoutName,
    type: 'skip',
    weekStart,
    createdAt: new Date().toISOString(),
    note,
  }
  persist([...changes, change])
  return change
}

export function restoreSession(
  workoutId: string,
  weekStart: string
): void {
  const changes = load()
  persist(
    changes.filter(
      (c) => !(c.workoutId === workoutId && c.weekStart === weekStart && c.type === 'skip')
    )
  )
}

export function rescheduleSession(
  workoutId: string,
  workoutName: string,
  weekStart: string,
  fromDate: string,
  toDate: string
): SessionPlanChange {
  const changes = load()
  const change: SessionPlanChange = {
    id: `spc-${Date.now()}`,
    workoutId,
    workoutName,
    type: 'reschedule',
    weekStart,
    createdAt: new Date().toISOString(),
    fromDate,
    toDate,
  }
  persist([...changes, change])
  return change
}

export function isSessionSkipped(workoutId: string, weekStart: string): boolean {
  return load().some(
    (c) => c.workoutId === workoutId && c.weekStart === weekStart && c.type === 'skip'
  )
}

export function getSkippedWorkoutIds(weekStart: string): string[] {
  return load()
    .filter((c) => c.weekStart === weekStart && c.type === 'skip')
    .map((c) => c.workoutId)
}
