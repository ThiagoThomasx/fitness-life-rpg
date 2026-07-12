export type RewardEventType = 'xp' | 'badge' | 'level_up' | 'attribute_up' | 'pr'

export interface RewardEvent {
  id: string
  type: RewardEventType
  title: string
  subtitle?: string
  value?: string
  icon: string
  createdAt: string
}

const STORAGE_KEY = 'lrpg-fit:reward-events'
const MAX_EVENTS = 50

function safeGet(): RewardEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RewardEvent[]) : []
  } catch {
    return []
  }
}

function safeSet(events: RewardEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {}
}

export function getRewardHistory(): RewardEvent[] {
  return safeGet()
}

export function addRewardEvent(event: Omit<RewardEvent, 'id' | 'createdAt'>): RewardEvent {
  const saved: RewardEvent = {
    ...event,
    id: `re-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  }
  const events = [saved, ...safeGet()].slice(0, MAX_EVENTS)
  safeSet(events)
  return saved
}
