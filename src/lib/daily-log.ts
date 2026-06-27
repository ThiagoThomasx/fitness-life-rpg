export interface DailyLogEntry {
  id: string
  date: string
  energyLevel: number
  sleepHours: number
  mood: string
  notes: string
  tags: string[]
  xpEarned: number
  createdAt: string
}

export const DAILY_LOG_XP = 10

const STORAGE_KEY = 'lrpg-fit:daily-logs'

function safeGet(): DailyLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DailyLogEntry[]) : []
  } catch {
    return []
  }
}

function safeSet(logs: DailyLogEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {}
}

export function getDailyLogs(): DailyLogEntry[] {
  return safeGet().sort((a, b) => (a.date > b.date ? -1 : 1))
}

export function getTodayLog(): DailyLogEntry | null {
  const today = new Date().toISOString().slice(0, 10)
  return safeGet().find((l) => l.date === today) ?? null
}

export function saveDailyLog(entry: Omit<DailyLogEntry, 'id' | 'createdAt'>): DailyLogEntry {
  const logs = safeGet()
  const existing = logs.findIndex((l) => l.date === entry.date)

  const saved: DailyLogEntry = {
    ...entry,
    id: existing >= 0 ? logs[existing].id : `dl-${Date.now()}`,
    createdAt: existing >= 0 ? logs[existing].createdAt : new Date().toISOString(),
  }

  if (existing >= 0) {
    logs[existing] = saved
  } else {
    logs.unshift(saved)
  }

  safeSet(logs)
  return saved
}

export function getDiaryCount(): number {
  return safeGet().length
}
