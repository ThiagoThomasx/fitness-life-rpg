import { getDailyLogs } from './daily-log'
import { getWorkoutHistory } from './workout-history'

export interface WeekDay {
  date: string
  label: string
  hasWorkout: boolean
  hasDiary: boolean
}

export interface WeeklyProgress {
  days: WeekDay[]
  workoutCount: number
  diaryCount: number
  totalXp: number
  workoutTarget: number
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getWeekDates(): string[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1))

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function getWeeklyProgress(): WeeklyProgress {
  const dates = getWeekDates()
  const history = getWorkoutHistory()
  const logs = getDailyLogs()

  const workoutDates = new Set(history.map((w) => w.completedAt.slice(0, 10)))
  const diaryDates = new Set(logs.map((l) => l.date))

  const fixed = dates.map((date, i) => {
    const dayIndex = (i + 1) % 7
    return {
      date,
      label: DAY_LABELS[dayIndex],
      hasWorkout: workoutDates.has(date),
      hasDiary: diaryDates.has(date),
    }
  })

  const weekWorkouts = history.filter((w) => dates.includes(w.completedAt.slice(0, 10)))
  const weekDiaries = logs.filter((l) => dates.includes(l.date))
  const totalXp =
    weekWorkouts.reduce((a, w) => a + w.xpEarned, 0) +
    weekDiaries.reduce((a, l) => a + l.xpEarned, 0)

  return {
    days: fixed,
    workoutCount: weekWorkouts.length,
    diaryCount: weekDiaries.length,
    totalXp,
    workoutTarget: 3,
  }
}
