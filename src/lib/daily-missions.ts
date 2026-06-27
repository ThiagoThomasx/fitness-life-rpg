import { getTodayLog } from './daily-log'
import { getWorkoutHistory } from './workout-history'

export type MissionStatus = 'done' | 'pending' | 'locked'

export interface DailyMission {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  status: MissionStatus
}

export interface DailyMissionsInput {
  hasDiaryToday: boolean
  workoutsThisWeek: number
  totalWorkouts: number
  level: number
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

export function buildMissionsInput(): DailyMissionsInput {
  const todayLog = getTodayLog()
  const history = getWorkoutHistory()
  const weekStart = getWeekStart()
  const workoutsThisWeek = history.filter((w) => w.completedAt.slice(0, 10) >= weekStart).length

  return {
    hasDiaryToday: todayLog !== null,
    workoutsThisWeek,
    totalWorkouts: history.length,
    level: 1,
  }
}

export function getDailyMissions(input: DailyMissionsInput): DailyMission[] {
  const missions: DailyMission[] = [
    {
      id: 'diary-today',
      title: 'Registrar o dia',
      description: 'Preencha o diário de hoje',
      icon: '📓',
      xpReward: 10,
      status: input.hasDiaryToday ? 'done' : 'pending',
    },
    {
      id: 'workout-this-week',
      title: 'Treinar esta semana',
      description: `${input.workoutsThisWeek}/3 treinos completados`,
      icon: '🏋️',
      xpReward: 50,
      status: input.workoutsThisWeek >= 3 ? 'done' : 'pending',
    },
    {
      id: 'stay-active',
      title: 'Manter sequência',
      description: 'Complete um treino hoje',
      icon: '🔥',
      xpReward: 20,
      status: input.workoutsThisWeek > 0 ? 'done' : 'pending',
    },
  ]

  if (input.totalWorkouts === 0) {
    missions[1].status = 'locked'
    missions[2].status = 'locked'
  }

  return missions
}
