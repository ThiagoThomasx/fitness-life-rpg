export type CampaignType =
  | 'lose_weight'
  | 'gain_consistency'
  | 'improve_strength'
  | '30_days_workout'
  | '12_weeks_routine'
  | 'custom'

export type CampaignStatus = 'active' | 'completed' | 'abandoned'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  description: string
  icon: string
  targetValue: number
  currentValue: number
  unit: string
  startDate: string
  endDate: string | null
  status: CampaignStatus
  xpReward: number
  createdAt: string
}

export interface WeeklyGoals {
  workouts: number
  diary: number
  nutrition: number
  missions: number
}

export interface WeeklyPlan {
  weekStart: string
  focus: string
  goals: WeeklyGoals
  completedAt: string | null
  xpEarned: number
}

export interface WeeklyPlanProgress {
  plan: WeeklyPlan
  actual: {
    workouts: number
    diary: number
    nutrition: number
    missions: number
  }
  completionPct: number
  isComplete: boolean
}
