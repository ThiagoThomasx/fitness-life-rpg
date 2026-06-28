import type { UserPreferences, FitnessGoal, WorkoutStyle } from './preferences'
import { MOCK_WORKOUTS, type MockWorkout } from './mock/data'
import { DAY_LABELS } from './preferences'

export interface WorkoutRecommendation {
  workout: MockWorkout
  reason: string
  score: number
}

export interface RoutineDay {
  dayIndex: number
  dayLabel: string
  workoutTypeCategory: string
  workoutIcon: string
  suggestion: string
  isRest: boolean
}

export interface WeeklyRoutineSuggestion {
  days: RoutineDay[]
  focusSuggestion: string
  goalNote: string
}

const EQUIPMENT_TO_CATEGORY: Record<string, string[]> = {
  bodyweight: ['agility', 'flexibility'],
  dumbbells: ['strength'],
  barbell: ['strength'],
  machines: ['strength'],
  resistance_bands: ['strength', 'agility'],
  cardio_machines: ['cardio'],
}

const GOAL_TO_CATEGORIES: Record<FitnessGoal, string[]> = {
  lose_weight: ['cardio', 'agility'],
  gain_muscle: ['strength'],
  improve_endurance: ['cardio', 'agility'],
  stay_healthy: ['strength', 'cardio', 'flexibility'],
  gain_strength: ['strength'],
}

const STYLE_TO_CATEGORY: Record<WorkoutStyle, string> = {
  strength: 'strength',
  cardio: 'cardio',
  hiit: 'agility',
  mixed: '',
}

function getAvailableCategories(prefs: UserPreferences): string[] {
  const cats = new Set<string>()
  for (const eq of prefs.equipment) {
    const c = EQUIPMENT_TO_CATEGORY[eq] ?? []
    c.forEach((x) => cats.add(x))
  }
  // Always allow flexibility
  cats.add('flexibility')
  return Array.from(cats)
}

function scoreWorkout(workout: MockWorkout, prefs: UserPreferences): number {
  let score = 0
  const goalCats = GOAL_TO_CATEGORIES[prefs.goal] ?? []
  const availCats = getAvailableCategories(prefs)

  // Goal alignment
  if (goalCats.includes(workout.workout_type.category)) score += 40

  // Equipment alignment (available categories)
  if (availCats.includes(workout.workout_type.category)) score += 30

  // Duration alignment (penalize far-off durations)
  const diff = Math.abs(workout.estimated_minutes - prefs.avgWorkoutMinutes)
  if (diff <= 10) score += 20
  else if (diff <= 20) score += 10

  // Style alignment
  const styleCat = STYLE_TO_CATEGORY[prefs.workoutStyle]
  if (styleCat && workout.workout_type.category === styleCat) score += 10

  // Level adjustment — flexibility/mobility for beginners
  if (prefs.fitnessLevel === 'beginner' && workout.workout_type.category === 'flexibility') {
    score += 5
  }

  return score
}

function reasonForWorkout(workout: MockWorkout, prefs: UserPreferences): string {
  const goalCats = GOAL_TO_CATEGORIES[prefs.goal] ?? []
  if (goalCats.includes(workout.workout_type.category)) {
    const goalMap: Record<FitnessGoal, string> = {
      lose_weight: 'Alinhado com seu objetivo de perder peso',
      gain_muscle: 'Ideal para ganho de massa muscular',
      improve_endurance: 'Ótimo para melhorar sua resistência',
      stay_healthy: 'Equilíbrio perfeito para sua saúde',
      gain_strength: 'Excelente para desenvolver força',
    }
    return goalMap[prefs.goal]
  }
  const diff = Math.abs(workout.estimated_minutes - prefs.avgWorkoutMinutes)
  if (diff <= 10) return `Duração ideal (~${workout.estimated_minutes}min) para sua rotina`
  return 'Recomendado com base no seu perfil'
}

export function getWorkoutRecommendations(
  prefs: UserPreferences,
  limit = 3
): WorkoutRecommendation[] {
  const all: WorkoutRecommendation[] = MOCK_WORKOUTS.map((w) => ({
    workout: w,
    reason: reasonForWorkout(w, prefs),
    score: scoreWorkout(w, prefs),
  }))

  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function getTodayRecommendation(prefs: UserPreferences): WorkoutRecommendation | null {
  const today = new Date().getDay()
  if (!prefs.preferredDays.includes(today)) return null
  const recs = getWorkoutRecommendations(prefs, 1)
  return recs[0] ?? null
}

const GOAL_FOCUS: Record<FitnessGoal, string> = {
  lose_weight: 'Cardio e queima de gordura',
  gain_muscle: 'Semana de volume e força',
  improve_endurance: 'Resistência e consistência',
  stay_healthy: 'Equilíbrio entre treino e descanso',
  gain_strength: 'Semana de força máxima',
}

const CATEGORY_ICONS: Record<string, string> = {
  strength: '💪',
  cardio: '🏃',
  agility: '⚡',
  flexibility: '🧘',
}

const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Força',
  cardio: 'Cardio',
  agility: 'Agilidade / HIIT',
  flexibility: 'Flexibilidade',
}

function buildRoutineDay(
  dayIndex: number,
  category: string,
  isRest: boolean
): RoutineDay {
  return {
    dayIndex,
    dayLabel: DAY_LABELS[dayIndex],
    workoutTypeCategory: isRest ? 'rest' : category,
    workoutIcon: isRest ? '😴' : (CATEGORY_ICONS[category] ?? '🏋️'),
    suggestion: isRest
      ? 'Descanso e recuperação'
      : CATEGORY_LABELS[category] ?? category,
    isRest,
  }
}

export function getWeeklyRoutineSuggestion(prefs: UserPreferences): WeeklyRoutineSuggestion {
  const goalCats = GOAL_TO_CATEGORIES[prefs.goal] ?? ['strength']
  const availCats = getAvailableCategories(prefs)
  const eligible = goalCats.filter((c) => availCats.includes(c))
  const catPool = eligible.length > 0 ? eligible : ['flexibility']

  const days: RoutineDay[] = Array.from({ length: 7 }, (_, i) => {
    if (!prefs.preferredDays.includes(i)) {
      return buildRoutineDay(i, '', true)
    }
    // Rotate categories across preferred days
    const idx = prefs.preferredDays.indexOf(i)
    const cat = catPool[idx % catPool.length]
    return buildRoutineDay(i, cat, false)
  })

  const goalNote: Record<FitnessGoal, string> = {
    lose_weight: 'Foco em treinos que maximizam gasto calórico.',
    gain_muscle: 'Priorize progressão de carga e proteína adequada.',
    improve_endurance: 'Aumente o volume gradualmente a cada semana.',
    stay_healthy: 'Consistência é mais importante que intensidade.',
    gain_strength: 'Dê prioridade ao sono e recuperação entre as sessões.',
  }

  return {
    days,
    focusSuggestion: GOAL_FOCUS[prefs.goal],
    goalNote: goalNote[prefs.goal],
  }
}
