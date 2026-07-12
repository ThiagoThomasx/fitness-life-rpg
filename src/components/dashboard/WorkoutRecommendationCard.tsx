"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSessionStore } from "@/stores/useSessionStore"
import { getCustomWorkouts, toMockWorkoutShape, getAllExercises } from "@/lib/custom-workouts"
import { MOCK_WORKOUTS } from "@/lib/mock/data"
import { getRecommendedWorkout, type WorkoutRecoveryInfo, type RecoveryEligibleWorkout } from "@/lib/workout-recovery"
import { MUSCLE_GROUP_LABELS } from "@/lib/muscle-groups"
import { WorkoutRecommendationReason } from "@/components/workouts/WorkoutRecommendationReason"
import { RecoveryIndicator } from "@/components/workouts/RecoveryIndicator"

export function WorkoutRecommendationCard() {
  const activeSession = useSessionStore((s) => s.activeSession)
  const [recommendation, setRecommendation] = useState<WorkoutRecoveryInfo | null | undefined>(undefined)
  const [hasAnyWorkout, setHasAnyWorkout] = useState(true)

  useEffect(() => {
    const allExercises = getAllExercises()
    const customWorkouts = getCustomWorkouts().map((cw) => toMockWorkoutShape(cw, allExercises))
    const allWorkouts: RecoveryEligibleWorkout[] = [...customWorkouts, ...MOCK_WORKOUTS]
    setHasAnyWorkout(allWorkouts.length > 0)
    setRecommendation(
      getRecommendedWorkout(allWorkouts, { activeWorkoutId: activeSession?.workout_id ?? null })
    )
  }, [activeSession])

  if (recommendation === undefined) return null

  if (!hasAnyWorkout) {
    return (
      <section className="card card--dashed flex flex-col items-center gap-2 text-center">
        <span className="text-3xl" aria-hidden="true">🧭</span>
        <p className="text-sm text-muted">Nenhum treino disponível.</p>
        <p className="text-xs text-muted">Crie seu primeiro treino para receber recomendações inteligentes.</p>
      </section>
    )
  }

  if (!recommendation) return null

  return (
    <Link
      href="/treinos"
      aria-label={`Treino recomendado: ${recommendation.workoutName}`}
      className="card card--interactive card--accent-top recommendation-card no-underline"
    >
      <div className="section-label recommendation-card__label">Treino Recomendado</div>
      <div className="recommendation-card__name">{recommendation.workoutName}</div>
      <WorkoutRecommendationReason reason={recommendation.reason} />
      {recommendation.muscleGroups.length > 0 && (
        <div className="recommendation-card__muscles">
          {recommendation.muscleGroups.map((group) => (
            <span key={group} className="badge-pill badge-pill--accent">
              {MUSCLE_GROUP_LABELS[group]}
            </span>
          ))}
        </div>
      )}
      <RecoveryIndicator lastCompletedAt={recommendation.lastCompletedAt} />
      <span className="btn btn--primary recommendation-card__cta">Iniciar treino</span>
    </Link>
  )
}
