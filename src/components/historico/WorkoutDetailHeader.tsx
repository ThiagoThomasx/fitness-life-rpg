"use client"

import Link from "next/link"
import type { CompletedWorkout } from "@/lib/workout-history"
import type { WorkoutDetailProgramInfo } from "@/lib/workout-detail-engine"

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h${rest}min` : `${hours}h`
}

type Origin = "planner" | "program" | "free"

function resolveOrigin(workout: CompletedWorkout): Origin {
  if (workout.source?.plannedWorkoutId) return "planner"
  if (workout.source?.programId) return "program"
  return "free"
}

const ORIGIN_LABELS: Record<Origin, string> = {
  planner: "Planner",
  program: "Programa",
  free: "Treino livre",
}

type WorkoutDetailHeaderProps = {
  workout: CompletedWorkout
  program: WorkoutDetailProgramInfo | null
}

/**
 * Cabeçalho do treino concluído (Sprint 22 Parte 3A §2). Mesma hierarquia de
 * `/exercicios/[id]`: nome → contexto (data/duração/origem) → link de volta.
 */
export function WorkoutDetailHeader({ workout, program }: WorkoutDetailHeaderProps) {
  const origin = resolveOrigin(workout)

  return (
    <header>
      <Link href="/treinos" className="text-xs text-muted">← Voltar aos treinos</Link>

      <div style={{ marginTop: "var(--space-2)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-bold text-primary">{workout.workoutName}</h1>
          <span className="badge-pill badge-pill--level">{ORIGIN_LABELS[origin]}</span>
          {workout.category && <span className="badge-pill badge-pill--level">{workout.category}</span>}
        </div>

        <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
          {formatDateTime(workout.completedAt)} · {formatDuration(workout.durationSeconds)}
          {program?.programName && (
            <>
              {" · "}
              <Link href={`/programas/${program.programId}`} className="text-xs" style={{ color: "var(--color-accent)" }}>
                {program.programName}
                {program.programWeekNumber !== undefined && ` (Semana ${program.programWeekNumber})`}
              </Link>
            </>
          )}
          {origin === "planner" && program === null && workout.source?.plannedWorkoutId && (
            <>
              {" · "}
              <Link href={`/plano/treino/${workout.source.plannedWorkoutId}`} className="text-xs" style={{ color: "var(--color-accent)" }}>
                Ver treino planejado
              </Link>
            </>
          )}
        </p>
      </div>
    </header>
  )
}
