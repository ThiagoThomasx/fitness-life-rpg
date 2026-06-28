export type FitnessGoal =
  | 'lose_weight'
  | 'gain_muscle'
  | 'improve_endurance'
  | 'stay_healthy'
  | 'gain_strength'

export type Equipment =
  | 'bodyweight'
  | 'dumbbells'
  | 'barbell'
  | 'machines'
  | 'resistance_bands'
  | 'cardio_machines'

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'

export type WorkoutStyle = 'strength' | 'cardio' | 'hiit' | 'mixed'

export interface UserPreferences {
  goal: FitnessGoal
  equipment: Equipment[]
  avgWorkoutMinutes: number
  preferredDays: number[] // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  fitnessLevel: FitnessLevel
  workoutStyle: WorkoutStyle
  onboardingCompleted: boolean
  updatedAt: string
}

export const PREFERENCES_KEY = 'lrpg-fit:preferences'

export const DEFAULT_PREFERENCES: UserPreferences = {
  goal: 'stay_healthy',
  equipment: ['bodyweight'],
  avgWorkoutMinutes: 45,
  preferredDays: [1, 3, 5],
  fitnessLevel: 'beginner',
  workoutStyle: 'mixed',
  onboardingCompleted: false,
  updatedAt: new Date().toISOString(),
}

export function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() })
    )
  } catch {}
}

export function completeOnboarding(
  prefs: Omit<UserPreferences, 'onboardingCompleted' | 'updatedAt'>
): void {
  savePreferences({ ...prefs, onboardingCompleted: true, updatedAt: new Date().toISOString() })
}

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_weight: 'Perder peso',
  gain_muscle: 'Ganhar músculo',
  improve_endurance: 'Melhorar resistência',
  stay_healthy: 'Manter saúde',
  gain_strength: 'Ganhar força',
}

export const GOAL_ICONS: Record<FitnessGoal, string> = {
  lose_weight: '🔥',
  gain_muscle: '💪',
  improve_endurance: '🏃',
  stay_healthy: '❤️',
  gain_strength: '🏋️',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: 'Peso corporal',
  dumbbells: 'Halteres',
  barbell: 'Barra olímpica',
  machines: 'Máquinas',
  resistance_bands: 'Elásticos',
  cardio_machines: 'Esteira / Bicicleta',
}

export const LEVEL_LABELS: Record<FitnessLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

export const STYLE_LABELS: Record<WorkoutStyle, string> = {
  strength: 'Força',
  cardio: 'Cardio',
  hiit: 'HIIT',
  mixed: 'Misto',
}

export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const DURATION_OPTIONS = [20, 30, 45, 60, 90] as const
