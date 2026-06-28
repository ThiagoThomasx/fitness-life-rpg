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
  category: 'diary' | 'workout' | 'movement' | 'wellness' | 'challenge'
}

export interface DailyMissionsInput {
  hasDiaryToday: boolean
  workoutsThisWeek: number
  totalWorkouts: number
  level: number
  sleepHoursToday: number | null
  moodToday: string | null
}

const MISSIONS_COMPLETED_KEY = 'lrpg-fit:missions-completed'

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getMissionCompletions(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(MISSIONS_COMPLETED_KEY)
    const all = raw ? JSON.parse(raw) as Record<string, Record<string, boolean>> : {}
    return all[getTodayKey()] ?? {}
  } catch {
    return {}
  }
}

export function completeMission(missionId: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(MISSIONS_COMPLETED_KEY)
    const all = raw ? JSON.parse(raw) as Record<string, Record<string, boolean>> : {}
    const today = getTodayKey()
    all[today] = { ...(all[today] ?? {}), [missionId]: true }
    window.localStorage.setItem(MISSIONS_COMPLETED_KEY, JSON.stringify(all))
  } catch {}
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
    sleepHoursToday: todayLog?.sleepHours ?? null,
    moodToday: todayLog?.mood ?? null,
  }
}

export function getDailyMissions(input: DailyMissionsInput): DailyMission[] {
  const completions = getMissionCompletions()

  const allMissions: DailyMission[] = [
    // Diary missions
    {
      id: 'diary-today',
      title: 'Registrar o dia',
      description: 'Preencha o diário de hoje',
      icon: '📓',
      xpReward: 10,
      status: input.hasDiaryToday ? 'done' : 'pending',
      category: 'diary',
    },

    // Workout missions
    {
      id: 'workout-this-week',
      title: '3 treinos na semana',
      description: `${Math.min(input.workoutsThisWeek, 3)}/3 treinos completados`,
      icon: '🏋️',
      xpReward: 50,
      status: input.workoutsThisWeek >= 3 ? 'done' : 'pending',
      category: 'workout',
    },
    {
      id: 'workout-today',
      title: 'Treinar hoje',
      description: 'Complete qualquer treino hoje',
      icon: '🔥',
      xpReward: 20,
      status: completions['workout-today'] ? 'done' : 'pending',
      category: 'workout',
    },

    // Movement missions
    {
      id: 'pushups-20',
      title: '20 Flexões',
      description: 'Complete 20 flexões (pode ser parcelado)',
      icon: '💪',
      xpReward: 15,
      status: completions['pushups-20'] ? 'done' : 'pending',
      category: 'movement',
    },
    {
      id: 'steps-5k',
      title: '5.000 Passos',
      description: 'Caminhe pelo menos 5.000 passos hoje',
      icon: '👟',
      xpReward: 20,
      status: completions['steps-5k'] ? 'done' : 'pending',
      category: 'movement',
    },
    {
      id: 'mobility-10min',
      title: '10min de Mobilidade',
      description: 'Faça 10 minutos de mobilidade ou alongamento',
      icon: '🧘',
      xpReward: 15,
      status: completions['mobility-10min'] ? 'done' : 'pending',
      category: 'movement',
    },
    {
      id: 'squat-30',
      title: '30 Agachamentos',
      description: 'Complete 30 agachamentos (pode ser parcelado)',
      icon: '🦵',
      xpReward: 12,
      status: completions['squat-30'] ? 'done' : 'pending',
      category: 'challenge',
    },

    // Wellness missions
    {
      id: 'sleep-7h',
      title: 'Dormir bem',
      description: 'Registre 7+ horas de sono no diário',
      icon: '😴',
      xpReward: 10,
      status: (input.sleepHoursToday ?? 0) >= 7 ? 'done' : 'pending',
      category: 'wellness',
    },
    {
      id: 'water-2l',
      title: 'Hidratação',
      description: 'Beba 2 litros de água hoje',
      icon: '💧',
      xpReward: 10,
      status: completions['water-2l'] ? 'done' : 'pending',
      category: 'wellness',
    },
    {
      id: 'mood-good',
      title: 'Humor positivo',
      description: 'Registre humor positivo no diário',
      icon: '😊',
      xpReward: 8,
      status: ['😊', '😁', '🔥'].includes(input.moodToday ?? '') ? 'done' : 'pending',
      category: 'wellness',
    },
  ]

  // Lock certain missions for complete beginners
  if (input.totalWorkouts === 0) {
    const lockedIds = ['workout-this-week', 'squat-30', 'pushups-20']
    return allMissions.map((m) =>
      lockedIds.includes(m.id) ? { ...m, status: 'locked' as MissionStatus } : m
    )
  }

  return allMissions
}
