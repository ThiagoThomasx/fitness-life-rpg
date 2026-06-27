export interface NutritionGoal {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface NutritionLog {
  id: string
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  xpEarned: number
  createdAt: string
}

export const NUTRITION_XP = 15

const GOAL_KEY = 'lrpg-fit:nutrition-goal'
const LOGS_KEY = 'lrpg-fit:nutrition-logs'

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const DEFAULT_GOAL: NutritionGoal = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 65,
}

export function getNutritionGoal(): NutritionGoal {
  return safeGet<NutritionGoal>(GOAL_KEY, DEFAULT_GOAL)
}

export function saveNutritionGoal(goal: NutritionGoal): void {
  safeSet(GOAL_KEY, goal)
}

export function getNutritionLogs(): NutritionLog[] {
  return safeGet<NutritionLog[]>(LOGS_KEY, [])
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getTodayNutritionLog(): NutritionLog | null {
  const logs = getNutritionLogs()
  return logs.find((l) => l.date === todayStr()) ?? null
}

export function saveNutritionLog(
  data: Pick<NutritionLog, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>,
  grantXp: boolean
): NutritionLog {
  const logs = getNutritionLogs()
  const existing = logs.find((l) => l.date === todayStr())
  const xpEarned = existing?.xpEarned ?? (grantXp ? NUTRITION_XP : 0)
  const entry: NutritionLog = {
    id: existing?.id ?? `nut-${Date.now()}`,
    date: todayStr(),
    ...data,
    xpEarned,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  const updated = existing
    ? logs.map((l) => (l.date === todayStr() ? entry : l))
    : [entry, ...logs]
  safeSet(LOGS_KEY, updated)
  return entry
}

export function getNutritionStreak(): number {
  const logs = getNutritionLogs()
  if (logs.length === 0) return 0
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  let cursor = todayStr()
  for (const log of sorted) {
    if (log.date === cursor) {
      streak++
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }
  return streak
}

export function getNutritionCount(): number {
  return getNutritionLogs().length
}
