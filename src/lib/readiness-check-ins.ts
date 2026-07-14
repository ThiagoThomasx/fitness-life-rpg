const CHECK_INS_KEY = 'lrpg-fit:readiness-check-ins'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkoutReadinessCheckIn {
  id: string
  workoutId?: string
  createdAt: string
  energy: 1 | 2 | 3 | 4 | 5
  soreness: 1 | 2 | 3 | 4 | 5
  sleepQuality: 1 | 2 | 3 | 4 | 5
  motivation: 1 | 2 | 3 | 4 | 5
  notes?: string
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadCheckIns(): WorkoutReadinessCheckIn[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CHECK_INS_KEY)
    return raw ? (JSON.parse(raw) as WorkoutReadinessCheckIn[]) : []
  } catch {
    return []
  }
}

function persistCheckIns(checkIns: WorkoutReadinessCheckIn[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns))
  } catch {
    // Storage unavailable — silently skip
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidRating(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

function isValidCheckIn(raw: unknown): raw is WorkoutReadinessCheckIn {
  if (typeof raw !== 'object' || raw === null) return false
  const c = raw as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.createdAt === 'string' &&
    isValidRating(c.energy) &&
    isValidRating(c.soreness) &&
    isValidRating(c.sleepQuality) &&
    isValidRating(c.motivation)
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCheckIns(): WorkoutReadinessCheckIn[] {
  return loadCheckIns()
}

export function getCheckInById(id: string): WorkoutReadinessCheckIn | null {
  return loadCheckIns().find((c) => c.id === id) ?? null
}

export function getCheckInsForWorkout(workoutId: string): WorkoutReadinessCheckIn[] {
  return loadCheckIns().filter((c) => c.workoutId === workoutId)
}

export function getTodayCheckIns(): WorkoutReadinessCheckIn[] {
  const today = new Date().toISOString().slice(0, 10)
  return loadCheckIns().filter((c) => c.createdAt.slice(0, 10) === today)
}

export function getRecentCheckIns(days = 7): WorkoutReadinessCheckIn[] {
  const cutoff = Date.now() - days * 86400000
  return loadCheckIns().filter((c) => new Date(c.createdAt).getTime() >= cutoff)
}

export function saveCheckIn(checkIn: WorkoutReadinessCheckIn): void {
  if (!isValidCheckIn(checkIn)) return
  const existing = loadCheckIns()
  // Deduplicate by id
  const filtered = existing.filter((c) => c.id !== checkIn.id)
  persistCheckIns([checkIn, ...filtered])
}

export function updateCheckIn(
  id: string,
  patch: Partial<Omit<WorkoutReadinessCheckIn, 'id' | 'createdAt'>>
): WorkoutReadinessCheckIn | null {
  const existing = loadCheckIns()
  const index = existing.findIndex((c) => c.id === id)
  if (index === -1) return null
  const updated = { ...existing[index], ...patch }
  if (!isValidCheckIn(updated)) return null
  const next = [...existing]
  next[index] = updated
  persistCheckIns(next)
  return updated
}

export function importCheckIns(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadCheckIns()
  const existingIds = new Set(existing.map((c) => c.id))
  let imported = 0
  let skipped = 0
  const toAdd: WorkoutReadinessCheckIn[] = []
  for (const item of raw) {
    if (isValidCheckIn(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }
  if (toAdd.length > 0) {
    persistCheckIns([...toAdd, ...existing])
  }
  return { imported, skipped }
}
