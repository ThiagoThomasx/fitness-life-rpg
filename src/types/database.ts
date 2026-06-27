export interface Character {
  id: string
  user_id: string
  name: string
  level: number
  current_xp: number
  total_xp: number
  strength: number
  agility: number
  dexterity: number
  constitution: number
  vitality: number
  created_at: string
  updated_at: string
}

export interface XpTransaction {
  id: string
  character_id: string
  amount: number
  source: 'workout' | 'daily_log' | 'personal_record' | 'new_exercise' | 'complete_workout'
  session_id: string | null
  notes: string | null
  created_at: string
}

export interface WorkoutType {
  id: string
  name: string
  slug: string
  category: 'strength' | 'agility' | 'dexterity' | 'cardio' | 'flexibility'
  base_xp: number
  icon: string | null
}

export interface Exercise {
  id: string
  workout_type_id: string
  name: string
  muscle_groups: string[]
  equipment: string[]
  instructions: string | null
}

export interface Workout {
  id: string
  user_id: string
  workout_type_id: string
  name: string
  notes: string | null
  created_at: string
}

export interface WorkoutSession {
  id: string
  workout_id: string
  user_id: string
  started_at: string
  completed_at: string | null
  xp_earned: number
  intensity_multiplier: number
  notes: string | null
}

export interface ExerciseSet {
  id: string
  session_id: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  is_pr: boolean
  created_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  energy_level: number
  sleep_hours: number
  mood: number
  notes: string | null
  created_at: string
}

export interface DailyNutrition {
  id: string
  user_id: string
  log_date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  created_at: string
}

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  icon: string
  requirement_type: string
  requirement_value: number
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
}

export interface PersonalRecord {
  user_id: string
  exercise_id: string
  exercise_name: string
  best_weight_kg: number
  best_reps: number
  estimated_1rm: number
  achieved_at: string
}
