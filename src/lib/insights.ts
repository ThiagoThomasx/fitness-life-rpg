import { getWorkoutHistory, type CompletedWorkout } from './workout-history'
import { getDailyLogs } from './daily-log'
import { getNutritionLogs, getNutritionGoal, type NutritionLog } from './nutrition'

export interface WeekVolume {
  week: string
  workouts: number
  xp: number
}

export interface ExerciseLoad {
  exerciseId: string
  exerciseName: string
  data: Array<{ date: string; maxWeight: number }>
}

export interface CategoryDist {
  name: string
  value: number
}

export interface TagFrequency {
  tag: string
  count: number
}

export interface DayFrequency {
  day: string
  count: number
}

export interface RecentPr {
  exerciseName: string
  weight_kg: number
  date: string
}

export interface NutritionWeek {
  week: string
  avgCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  days: number
}

export interface InsightsData {
  totalWorkouts: number
  totalXpWorkouts: number
  totalXpDiary: number
  totalPrs: number
  weekVolumes: WeekVolume[]
  topExerciseLoads: ExerciseLoad[]
  categoryDist: CategoryDist[]
  tagFrequency: TagFrequency[]
  dayFrequency: DayFrequency[]
  recentPrs: RecentPr[]
  nutritionWeeks: NutritionWeek[]
  nutritionGoalCalories: number
}

function getIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Força',
  cardio: 'Cardio',
  agility: 'Agilidade',
  flexibility: 'Flexibilidade',
  dexterity: 'Destreza',
}

export function computeInsights(): InsightsData {
  const history = getWorkoutHistory()
  const logs = getDailyLogs()

  const totalWorkouts = history.length
  const totalXpWorkouts = history.reduce((s, w) => s + w.xpEarned, 0)
  const totalXpDiary = logs.reduce((s, l) => s + l.xpEarned, 0)
  const totalPrs = history.reduce((s, w) => s + w.prsCount, 0)

  // --- Week volumes (last 8 weeks) ---
  const weekMap = new Map<string, { workouts: number; xp: number }>()
  for (const w of history) {
    const week = getIsoWeek(new Date(w.completedAt))
    const entry = weekMap.get(week) ?? { workouts: 0, xp: 0 }
    weekMap.set(week, { workouts: entry.workouts + 1, xp: entry.xp + w.xpEarned })
  }
  const weekVolumes: WeekVolume[] = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, v]) => ({ week: week.replace(/\d{4}-/, ''), workouts: v.workouts, xp: v.xp }))

  // --- Top exercises by load progression (top 3 most trained) ---
  const exerciseTrainCount = new Map<string, { name: string; count: number }>()
  for (const w of history) {
    for (const ex of w.exercises) {
      const entry = exerciseTrainCount.get(ex.exerciseId) ?? { name: ex.exerciseName, count: 0 }
      exerciseTrainCount.set(ex.exerciseId, { name: entry.name, count: entry.count + 1 })
    }
  }
  const top3Ids = Array.from(exerciseTrainCount.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([id]) => id)

  const topExerciseLoads: ExerciseLoad[] = top3Ids.map((exId) => {
    const name = exerciseTrainCount.get(exId)!.name
    const data: Array<{ date: string; maxWeight: number }> = []
    for (const w of [...history].reverse()) {
      const ex = w.exercises.find((e) => e.exerciseId === exId)
      if (!ex) continue
      const max = Math.max(...ex.sets.map((s) => s.weight_kg), 0)
      if (max > 0) data.push({ date: w.completedAt.slice(0, 10), maxWeight: max })
    }
    return { exerciseId: exId, exerciseName: name, data }
  }).filter((e) => e.data.length >= 2)

  // --- Category distribution ---
  const catCount = new Map<string, number>()
  for (const w of history) {
    catCount.set(w.category, (catCount.get(w.category) ?? 0) + 1)
  }
  const categoryDist: CategoryDist[] = Array.from(catCount.entries())
    .map(([cat, value]) => ({ name: CATEGORY_LABELS[cat] ?? cat, value }))
    .sort((a, b) => b.value - a.value)

  // --- Day frequency ---
  const dayCount = new Array<number>(7).fill(0)
  for (const w of history) {
    const d = new Date(w.completedAt).getDay()
    dayCount[d]++
  }
  const dayFrequency: DayFrequency[] = DAY_NAMES.map((day, i) => ({ day, count: dayCount[i] }))

  // --- Tag frequency ---
  const tagCount = new Map<string, number>()
  for (const log of logs) {
    for (const tag of log.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
    }
  }
  const tagFrequency: TagFrequency[] = Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // --- Recent PRs ---
  const recentPrs: RecentPr[] = []
  for (const w of history) {
    for (const ex of w.exercises) {
      for (const set of ex.sets) {
        if (set.isPr && recentPrs.length < 5) {
          recentPrs.push({
            exerciseName: ex.exerciseName,
            weight_kg: set.weight_kg,
            date: w.completedAt.slice(0, 10),
          })
        }
      }
    }
    if (recentPrs.length >= 5) break
  }

  // --- Nutrition weekly aggregation (last 8 weeks) ---
  const nutLogs = getNutritionLogs()
  const nutritionGoalCalories = getNutritionGoal().calories
  const nutWeekMap = new Map<string, { calories: number[]; protein: number[]; carbs: number[]; fat: number[] }>()
  for (const log of nutLogs) {
    const week = getIsoWeek(new Date(log.date))
    const entry = nutWeekMap.get(week) ?? { calories: [], protein: [], carbs: [], fat: [] }
    entry.calories.push(log.calories)
    entry.protein.push(log.protein_g)
    entry.carbs.push(log.carbs_g)
    entry.fat.push(log.fat_g)
    nutWeekMap.set(week, entry)
  }
  const nutritionWeeks: NutritionWeek[] = Array.from(nutWeekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, v]) => ({
      week: week.replace(/\d{4}-/, ''),
      avgCalories: Math.round(v.calories.reduce((s, c) => s + c, 0) / v.calories.length),
      totalProtein: Math.round(v.protein.reduce((s, c) => s + c, 0)),
      totalCarbs: Math.round(v.carbs.reduce((s, c) => s + c, 0)),
      totalFat: Math.round(v.fat.reduce((s, c) => s + c, 0)),
      days: v.calories.length,
    }))

  return {
    totalWorkouts,
    totalXpWorkouts,
    totalXpDiary,
    totalPrs,
    weekVolumes,
    topExerciseLoads,
    categoryDist,
    tagFrequency,
    dayFrequency,
    recentPrs,
    nutritionWeeks,
    nutritionGoalCalories,
  }
}
