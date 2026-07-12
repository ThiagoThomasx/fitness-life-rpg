"use client"

import { getGreeting } from "@/lib/greeting"
import type { WorkoutRecommendation } from "@/lib/recommendations"
import type { AnyWorkout } from "./WorkoutCard"
import { WorkoutQuickStart } from "./WorkoutQuickStart"

type WorkoutsHeroProps = {
  characterName: string
  totalWorkouts: number
  totalExercises: number
  recommendation: WorkoutRecommendation | null
  onStart: (workout: AnyWorkout) => void
}

export function WorkoutsHero({
  characterName,
  totalWorkouts,
  totalExercises,
  recommendation,
  onStart,
}: WorkoutsHeroProps) {
  return (
    <section className="card workouts-hero" aria-label="Resumo de treinos">
      <div className="min-w-0">
        <div className="section-label">{getGreeting()}, {characterName}</div>
        <h2 className="display-heading text-2xl">Pronto para o próximo treino?</h2>
      </div>

      <div className="workouts-hero__stats">
        <div className="metric-card">
          <div className="metric-card__value">{totalWorkouts}</div>
          <div className="metric-card__label">treinos cadastrados</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__value">{totalExercises}</div>
          <div className="metric-card__label">exercícios na biblioteca</div>
        </div>
      </div>

      {recommendation && (
        <WorkoutQuickStart
          workout={recommendation.workout as AnyWorkout}
          reason={recommendation.reason}
          onStart={() => onStart(recommendation.workout as AnyWorkout)}
        />
      )}
    </section>
  )
}
