"use client"

import { useState } from "react"
import Link from "next/link"
import type { NormalizedExerciseExecution, ExerciseTimelineOrder } from "@/lib/exercise-intelligence"

const PAGE_SIZE = 10

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function TimelineItem({ execution }: { execution: NormalizedExerciseExecution }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="exercise-timeline-item">
      <div className="exercise-timeline-item__header">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-primary">{formatDate(execution.performedAt)}</div>
          <div className="text-xs text-muted truncate">
            {execution.workoutName}
            {execution.programWeekNumber !== undefined && ` · Semana ${execution.programWeekNumber}`}
          </div>
          {execution.wasSubstitution && (
            <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
              substituído de <span className="font-semibold">{execution.substitutedFromExerciseName}</span>
              {execution.substitutionReason && ` (${execution.substitutionReason})`}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-secondary">{execution.totalSets} série{execution.totalSets !== 1 ? "s" : ""}</div>
          {execution.totalVolumeKg > 0 && <div className="text-xs text-muted">{Math.round(execution.totalVolumeKg)}kg volume</div>}
        </div>
      </div>

      <button
        type="button"
        className="text-xs text-muted"
        style={{ marginTop: "var(--space-2)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Ocultar séries" : `Ver ${execution.totalSets} série${execution.totalSets !== 1 ? "s" : ""}`}
      </button>

      {expanded && (
        <div className="exercise-timeline-item__sets">
          {execution.sets.map((set, i) => (
            <span key={i} className={set.isPr ? "set-chip set-chip--pr" : "set-chip"}>
              {set.weight_kg > 0 ? `${set.weight_kg}kg × ` : ""}{set.reps}
              {set.isPr ? " 🏆" : ""}
            </span>
          ))}
        </div>
      )}

      {execution.plannedWorkoutId && (
        <Link href={`/plano/treino/${execution.plannedWorkoutId}`} className="text-xs" style={{ marginTop: "var(--space-2)", display: "inline-block", color: "var(--color-accent)" }}>
          Ver treino planejado
        </Link>
      )}
    </li>
  )
}

type ExerciseTimelineSectionProps = {
  executions: NormalizedExerciseExecution[]
}

/**
 * Timeline de execuções (Sprint 22 §19/§20/§21/§34). Paginação simples
 * ("carregar mais", sem virtualização prematura) e ordenação alternável —
 * ambas client-side sobre os dados já normalizados pelo motor.
 */
export function ExerciseTimelineSection({ executions }: ExerciseTimelineSectionProps) {
  const [order, setOrder] = useState<ExerciseTimelineOrder>("newest_first")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  if (executions.length === 0) {
    return (
      <section className="card" aria-labelledby="exercise-timeline-title">
        <h2 id="exercise-timeline-title" className="section-label">Histórico de execuções</h2>
        <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
          Este exercício ainda não possui execuções registradas.
        </p>
      </section>
    )
  }

  const ordered = order === "newest_first" ? executions : [...executions].reverse()
  const visible = ordered.slice(0, visibleCount)

  return (
    <section className="card" aria-labelledby="exercise-timeline-title">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 id="exercise-timeline-title" className="section-label">Histórico de execuções</h2>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ fontSize: "var(--text-xs)" }}
          onClick={() => setOrder((o) => (o === "newest_first" ? "oldest_first" : "newest_first"))}
        >
          {order === "newest_first" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
        </button>
      </div>

      <ul className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)", listStyle: "none" }}>
        {visible.map((execution) => (
          <TimelineItem key={`${execution.workoutId}-${execution.performedAt}`} execution={execution} />
        ))}
      </ul>

      {visibleCount < ordered.length && (
        <button
          type="button"
          className="btn btn--ghost btn--full"
          style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)" }}
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
        >
          Carregar mais ({ordered.length - visibleCount} restantes)
        </button>
      )}
    </section>
  )
}
