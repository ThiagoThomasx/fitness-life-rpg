import type { WeeklyPlan, WeeklyGoals, WeeklyPlanProgress } from '@/types/planning'
import { getWorkoutHistory } from './workout-history'
import { getDailyLogs } from './daily-log'
import { getNutritionLogs } from './nutrition'

const STORAGE_KEY = 'lrpg-fit:weekly-plan'
const PLAN_XP_REWARD = 150

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

function safeGet(): WeeklyPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WeeklyPlan) : null
  } catch {
    return null
  }
}

function safeSet(plan: WeeklyPlan): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
  } catch {}
}

export function getCurrentWeekPlan(): WeeklyPlan | null {
  const plan = safeGet()
  if (!plan) return null
  const currentWeekStart = getWeekStart()
  if (plan.weekStart !== currentWeekStart) return null
  return plan
}

export function saveWeeklyPlan(focus: string, goals: WeeklyGoals): WeeklyPlan {
  const weekStart = getWeekStart()
  const existing = getCurrentWeekPlan()
  const plan: WeeklyPlan = {
    weekStart,
    focus,
    goals,
    completedAt: existing?.completedAt ?? null,
    xpEarned: existing?.xpEarned ?? 0,
  }
  safeSet(plan)
  return plan
}

export function getDefaultGoals(): WeeklyGoals {
  return { workouts: 3, diary: 5, nutrition: 5, missions: 10 }
}

function countInRange(dates: string[], start: string, end: string): number {
  return dates.filter((d) => d >= start && d <= end).length
}

function getMissionCountThisWeek(start: string, end: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem('lrpg-fit:missions-completed')
    const all: Record<string, Record<string, boolean>> = raw ? JSON.parse(raw) : {}
    let count = 0
    for (const [date, missions] of Object.entries(all)) {
      if (date >= start && date <= end) {
        count += Object.values(missions).filter(Boolean).length
      }
    }
    return count
  } catch {
    return 0
  }
}

export function getWeeklyPlanProgress(): WeeklyPlanProgress | null {
  const plan = getCurrentWeekPlan()
  if (!plan) return null

  const end = getWeekEnd(plan.weekStart)

  const workoutHistory = getWorkoutHistory()
  const workoutsThisWeek = workoutHistory.filter(
    (w) => w.completedAt >= plan.weekStart && w.completedAt <= end
  ).length

  const allLogs = getDailyLogs()
  const diaryThisWeek = countInRange(allLogs.map((l) => l.date), plan.weekStart, end)

  const nutritionLogs = getNutritionLogs()
  const nutritionThisWeek = countInRange(nutritionLogs.map((l) => l.date), plan.weekStart, end)

  const missionsThisWeek = getMissionCountThisWeek(plan.weekStart, end)

  const actual = {
    workouts: workoutsThisWeek,
    diary: diaryThisWeek,
    nutrition: nutritionThisWeek,
    missions: missionsThisWeek,
  }

  const pcts = [
    Math.min(actual.workouts / Math.max(plan.goals.workouts, 1), 1),
    Math.min(actual.diary / Math.max(plan.goals.diary, 1), 1),
    Math.min(actual.nutrition / Math.max(plan.goals.nutrition, 1), 1),
    Math.min(actual.missions / Math.max(plan.goals.missions, 1), 1),
  ]
  const completionPct = Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100)
  const isComplete = completionPct >= 100

  if (isComplete && !plan.completedAt) {
    const updated: WeeklyPlan = { ...plan, completedAt: new Date().toISOString(), xpEarned: PLAN_XP_REWARD }
    safeSet(updated)
    return { plan: updated, actual, completionPct: 100, isComplete: true }
  }

  return { plan, actual, completionPct, isComplete }
}

export function getAllWeeklyPlans(): WeeklyPlan[] {
  const current = safeGet()
  return current ? [current] : []
}

export { PLAN_XP_REWARD }
