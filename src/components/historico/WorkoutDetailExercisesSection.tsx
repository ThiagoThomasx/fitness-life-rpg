"use client"

import Link from "next/link"
import type { ExerciseRecord } from "@/lib/workout-history"
import { calculateVolumeKg } from "@/lib/exercise-records"

type WorkoutDetailExercisesSectionProps = {
  exercises: ExerciseRecord[]
}

/**
 * Lista de exercícios executados (Sprint 22 Parte 3A §4): nome, séries,
 * carga, repetições, volume — e a substituição planejado → executado quando
 * houve troca. Cada nome linka para `/exercicios/[id]`, mesmo quando o
 * exercício não está mais na biblioteca ativa (a rota de detalhe já trata
 * esse caso — Sprint 22 Parte 2).
 */
export function WorkoutDetailExercisesSection({ exercises }: WorkoutDetailExercisesSectionProps) {
  return (
    <section className="card" aria-labelledby="workout-exercises-title">
      <h2 id="workout-exercises-title" className="section-label">Exercícios</h2>

      <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
        {exercises.map((exercise, index) => {
          const totalReps = exercise.sets.reduce((sum, s) => sum + s.reps, 0)
          const maxWeightKg = exercise.sets.reduce((max, s) => Math.max(max, s.weight_kg), 0)
          const volumeKg = calculateVolumeKg(exercise.sets)

          return (
            <div key={`${exercise.exerciseId}-${index}`} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Link href={`/exercicios/${exercise.exerciseId}`} className="text-sm font-semibold text-primary">
                  {exercise.exerciseName}
                </Link>
                {(exercise.isWeightPr || exercise.isRepsPr || exercise.isVolumePr || exercise.isFirstTime) && (
                  <span className="badge-pill badge-pill--accent">🏆 Recorde</span>
                )}
              </div>

              {exercise.substitution && (
                <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
                  substituiu <span className="font-semibold">{exercise.substitution.plannedExerciseName}</span>
                  {exercise.substitution.reason && ` (${exercise.substitution.reason})`}
                </div>
              )}

              <div className="text-xs text-secondary" style={{ marginTop: "var(--space-1)" }}>
                {exercise.sets.length} série{exercise.sets.length !== 1 ? "s" : ""} · {totalReps} repetições
                {maxWeightKg > 0 && ` · ${maxWeightKg}kg máx`}
                {volumeKg > 0 && ` · ${Math.round(volumeKg)}kg volume`}
              </div>

              {exercise.sets.length > 0 && (
                <div className="exercise-timeline-item__sets" style={{ marginTop: "var(--space-2)" }}>
                  {exercise.sets.map((set, setIndex) => (
                    <span key={setIndex} className={set.isPr ? "set-chip set-chip--pr" : "set-chip"}>
                      {set.weight_kg > 0 ? `${set.weight_kg}kg × ` : ""}{set.reps}
                      {set.isPr ? " 🏆" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
