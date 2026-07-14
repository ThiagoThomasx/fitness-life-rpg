const HISTORY_KEY = 'lrpg-fit:workout-history'

export interface SetRecord {
  weight_kg: number
  reps: number
  isPr: boolean
}

export interface ExerciseRecord {
  exerciseId: string
  exerciseName: string
  sets: SetRecord[]
  // Sprint 12: metadados aditivos de recorde (aba de progressão/Insights/Perfil).
  // Nunca lidos por calculateXpGain/checkAndEarnBadges — esses seguem via prsCount/isPr.
  isWeightPr?: boolean
  isRepsPr?: boolean
  isVolumePr?: boolean
  isFirstTime?: boolean
  estimated1RMKg?: number | null
}

export interface CompletedWorkout {
  id: string
  workoutId: string
  workoutName: string
  workoutColor: string
  category: string
  startedAt: string
  completedAt: string
  durationSeconds: number
  xpEarned: number
  exercises: ExerciseRecord[]
  prsCount: number
  // Sprint 14: link ao check-in de prontidão pré-treino (opcional, compatível com histórico antigo)
  checkInId?: string
  // Sprint 15: snapshot do ajuste aplicado nesta sessão (opcional, compatível com histórico antigo)
  appliedSessionAdjustment?: import('./session-adjustments').AppliedSessionAdjustmentSnapshot
}

function loadHistory(): CompletedWorkout[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as CompletedWorkout[]) : []
  } catch {
    return []
  }
}

function persistHistory(history: CompletedWorkout[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // Storage unavailable — silently skip
  }
}

export function getWorkoutHistory(): CompletedWorkout[] {
  return loadHistory()
}

export function getLastWorkout(): CompletedWorkout | null {
  return loadHistory()[0] ?? null
}

export function saveCompletedWorkout(workout: CompletedWorkout): void {
  const history = loadHistory()
  persistHistory([workout, ...history])
}

export function getExerciseHistory(exerciseId: string): ExerciseRecord[] {
  return loadHistory().flatMap((w) =>
    w.exercises.filter((e) => e.exerciseId === exerciseId)
  )
}

export function getExercisePersonalBest(exerciseId: string): number {
  let best = 0
  for (const record of getExerciseHistory(exerciseId)) {
    for (const set of record.sets) {
      if (set.weight_kg > best) best = set.weight_kg
    }
  }
  return best
}
