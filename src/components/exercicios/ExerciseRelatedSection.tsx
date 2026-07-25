"use client"

import Link from "next/link"
import type { ExerciseRelatedWorkout } from "@/lib/exercise-detail-engine"
import { getTrainingProgramById } from "@/lib/training-programs"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

type ExerciseRelatedSectionProps = {
  related: ExerciseRelatedWorkout[]
}

/**
 * Programas e treinos relacionados (Sprint 22 §25) — hierarquia Programa →
 * treino → quantidade de execuções. Abre o programa quando `programId`
 * existe (rota `/programas/[id]` já existe); abre o treino planejado quando
 * `plannedWorkoutId` existe (rota `/plano/treino/[id]`) — treinos livres sem
 * vínculo de Planner mostram só o nome, sem link quebrado.
 */
export function ExerciseRelatedSection({ related }: ExerciseRelatedSectionProps) {
  if (related.length === 0) return null

  return (
    <section className="card" aria-labelledby="exercise-related-title">
      <h2 id="exercise-related-title" className="section-label">Programas e treinos relacionados</h2>
      <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
        {related.map((r) => {
          const program = r.programId ? getTrainingProgramById(r.programId) : null
          return (
            <div key={r.key} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              {program && (
                <Link href={`/programas/${program.id}`} className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                  {program.name}
                </Link>
              )}
              <div className="flex items-center justify-between" style={{ marginTop: program ? "var(--space-1)" : 0 }}>
                {r.plannedWorkoutId ? (
                  <Link href={`/plano/treino/${r.plannedWorkoutId}`} className="text-sm font-semibold text-primary">
                    {r.workoutName}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-primary">{r.workoutName}</span>
                )}
                <span className="badge-pill badge-pill--level">{r.occurrences}x</span>
              </div>
              <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
                Última vez: {formatDate(r.lastPerformedAt)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
