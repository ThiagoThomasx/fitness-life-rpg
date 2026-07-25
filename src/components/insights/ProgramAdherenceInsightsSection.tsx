"use client"

import Link from "next/link"
import { getTrainingPrograms } from "@/lib/training-programs"
import { getPlannedWorkouts } from "@/lib/planned-workouts"
import { getWorkoutHistory } from "@/lib/workout-history"
import { buildProgramAdherenceSnapshot, computeOnTimeRate, adherenceRateLabel } from "@/lib/program-progress"

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatPct(rate: number | undefined): string {
  return rate !== undefined ? `${Math.round(rate * 100)}%` : "—"
}

/**
 * Sprint 21 Parte 4B — seção "Adesão ao plano" em Insights. Reusa
 * `program-progress.ts` (Parte 3) inteiramente; não recalcula nada aqui.
 * Só mostra programas com pelo menos uma sessão planejada vinculada — sem
 * isso, não há adesão para resumir.
 */
export function ProgramAdherenceInsightsSection() {
  const today = todayLocal()
  const programs = getTrainingPrograms()
  const planned = getPlannedWorkouts()
  const completed = getWorkoutHistory()

  const rows = programs
    .map((program) => {
      const snapshot = buildProgramAdherenceSnapshot(program, planned, completed, today)
      if (snapshot.weekSummaries.length === 0) return null
      return {
        program,
        snapshot,
        onTimeRate: computeOnTimeRate(planned, program.id),
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length === 0) {
    return (
      <section className="insights-section" aria-labelledby="program-adherence-insights-heading">
        <h2 id="program-adherence-insights-heading" className="insights-section__title">Adesão ao plano</h2>
        <div className="card card--dashed empty-state">
          <p className="empty-state__desc">
            Instancie um programa no Planner e conclua algumas sessões para ver a adesão aqui.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="insights-section" aria-labelledby="program-adherence-insights-heading">
      <h2 id="program-adherence-insights-heading" className="insights-section__title">Adesão ao plano</h2>
      <div className="flex flex-col gap-2">
        {rows.map(({ program, snapshot, onTimeRate }) => (
          <Link key={program.id} href={`/programas/${program.id}`} className="card" style={{ display: "block" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">{program.name}</span>
              <span className="badge-pill badge-pill--level">{adherenceRateLabel(snapshot.adherenceRate)}</span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
              {snapshot.completedSessions}/{snapshot.plannedSessions} concluídas · adesão {formatPct(snapshot.adherenceRate)}
              · pontualidade {formatPct(onTimeRate)}
              {snapshot.extraSessions > 0 && ` · ${snapshot.extraSessions} sessão(ões) extra(s)`}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
