"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getPlannedWorkouts, type PlannedWorkout } from "@/lib/planned-workouts"
import { getWorkoutHistory, type CompletedWorkout } from "@/lib/workout-history"
import { getTrainingProgramById, type TrainingProgram } from "@/lib/training-programs"
import {
  buildProgramAdherenceSnapshot,
  findNextPlannedWorkout,
  computeOnTimeRate,
  findMostDeviatedSession,
  adherenceRateLabel,
} from "@/lib/program-progress"

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const toDateOnly = (d: Date) => d.toISOString().slice(0, 10)
  return { start: toDateOnly(monday), end: toDateOnly(sunday) }
}

function formatPct(rate: number | undefined): string {
  return rate !== undefined ? `${Math.round(rate * 100)}%` : "—"
}

/**
 * Resumo semanal do programa ativo (Sprint 21 Parte 3 — seção 12). "Programa
 * ativo" = o primeiro vinculado a uma sessão planejada dentro da semana
 * corrente; sem isso, o componente não renderiza nada (não é regressão —
 * simplesmente não há programa em andamento para resumir).
 */
export function ProgramAdherenceSummary() {
  const [state, setState] = useState<{
    program: TrainingProgram
    planned: PlannedWorkout[]
    completed: CompletedWorkout[]
  } | null>(null)

  useEffect(() => {
    const { start, end } = currentWeekRange()
    const allPlanned = getPlannedWorkouts()
    const thisWeek = allPlanned.filter((p) => p.date >= start && p.date <= end)
    const activeProgramId = thisWeek.find((p) => p.source?.programId)?.source?.programId
    if (!activeProgramId) return

    const program = getTrainingProgramById(activeProgramId)
    if (!program) return

    setState({ program, planned: allPlanned, completed: getWorkoutHistory() })
  }, [])

  if (!state) return null

  const { program, planned, completed } = state
  const today = todayLocal()
  const snapshot = buildProgramAdherenceSnapshot(program, planned, completed, today)
  const currentWeek = snapshot.weekSummaries.find((w) => w.dataStatus === "in_progress") ?? snapshot.weekSummaries.at(-1)
  const nextWorkout = findNextPlannedWorkout(planned, program.id, today)
  const onTimeRate = computeOnTimeRate(planned, program.id)
  const mostDeviated = findMostDeviatedSession(planned, completed, program.id, today)

  if (!currentWeek) return null

  return (
    <section className="card" aria-labelledby="program-adherence-title">
      <div className="section-header">
        <h3 id="program-adherence-title" className="section-label" style={{ marginBottom: 0 }}>
          📊 {program.name} — Semana {currentWeek.weekNumber} de {program.weeks.length}
        </h3>
        <Link href={`/programas/${program.id}`} className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }}>
          Ver programa
        </Link>
      </div>

      <div className="text-sm text-secondary" style={{ marginTop: "var(--space-2)" }}>
        {currentWeek.plannedSessions} planejado(s) · {currentWeek.completedSessions} concluído(s) ·{" "}
        {currentWeek.pendingSessions} pendente(s) · {currentWeek.skippedSessions} ignorado(s)
      </div>

      <div className="grid grid-cols-3 gap-2" style={{ marginTop: "var(--space-3)" }}>
        <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
          <span className="text-xs text-muted">Adesão</span>
          <div className="text-sm font-semibold text-primary">{formatPct(snapshot.adherenceRate)}</div>
        </div>
        <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
          <span className="text-xs text-muted">Pontualidade</span>
          <div className="text-sm font-semibold text-primary">{formatPct(onTimeRate)}</div>
        </div>
        <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
          <span className="text-xs text-muted">Status</span>
          <div className="text-sm font-semibold text-primary">{adherenceRateLabel(snapshot.adherenceRate)}</div>
        </div>
      </div>

      {(nextWorkout || mostDeviated) && (
        <div className="flex flex-col gap-1" style={{ marginTop: "var(--space-3)" }}>
          {nextWorkout && (
            <Link href={`/plano/treino/${nextWorkout.id}`} className="text-xs text-secondary">
              Próximo: {nextWorkout.name} · {nextWorkout.date}
            </Link>
          )}
          {mostDeviated && (
            <Link href={`/plano/treino/${mostDeviated.id}`} className="text-xs text-muted">
              Maior desvio: {mostDeviated.name} · {mostDeviated.date}
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
