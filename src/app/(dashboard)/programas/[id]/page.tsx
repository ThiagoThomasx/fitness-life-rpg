"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getTrainingProgramById, type TrainingProgram } from "@/lib/training-programs"
import { getPlannedWorkouts, type PlannedWorkout } from "@/lib/planned-workouts"
import { getWorkoutHistory, type CompletedWorkout } from "@/lib/workout-history"
import {
  buildProgramAdherenceSnapshot,
  findNextPlannedWorkout,
  computeOnTimeRate,
  adherenceRateLabel,
} from "@/lib/program-progress"
import type { TrainingProgramAdherence } from "@/lib/program-adherence"
import { EmptyState } from "@/components/ui/EmptyState"

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatPct(rate: number | undefined): string {
  return rate !== undefined ? `${Math.round(rate * 100)}%` : "—"
}

const WEEK_DATA_STATUS_LABELS: Record<TrainingProgramAdherence["weekSummaries"][number]["dataStatus"], string> = {
  complete: "Concluída",
  in_progress: "Em andamento",
  future: "Futura",
  insufficient_data: "Sem dados",
}

/**
 * Progresso operacional do programa (Sprint 21 — Parte 3, seção 16). Não
 * duplica gráficos de carga/distribuição muscular já existentes em
 * Insights — só o resumo operacional e um link para lá.
 */
export default function ProgramProgressPage() {
  const params = useParams<{ id: string }>()
  const [program, setProgram] = useState<TrainingProgram | null | undefined>(undefined)
  const [planned, setPlanned] = useState<PlannedWorkout[]>([])
  const [completed, setCompleted] = useState<CompletedWorkout[]>([])

  useEffect(() => {
    setProgram(getTrainingProgramById(params.id))
    setPlanned(getPlannedWorkouts())
    setCompleted(getWorkoutHistory())
  }, [params.id])

  if (program === undefined) return null

  if (program === null) {
    return (
      <div className="page-container">
        <EmptyState title="Programa não encontrado" description="Ele pode ter sido excluído." />
      </div>
    )
  }

  const today = todayLocal()
  const snapshot = buildProgramAdherenceSnapshot(program, planned, completed, today)
  const currentWeek = snapshot.weekSummaries.find((w) => w.dataStatus === "in_progress") ?? snapshot.weekSummaries.at(-1)
  const nextWorkout = findNextPlannedWorkout(planned, program.id, today)
  const onTimeRate = computeOnTimeRate(planned, program.id)
  const remainingSessions = snapshot.plannedSessions - snapshot.completedSessions - snapshot.partialSessions
  const remainingWeeks = currentWeek ? program.weeks.length - currentWeek.weekNumber : undefined

  return (
    <div className="page-container">
      <Link href="/programas" className="text-xs text-muted">← Voltar aos programas</Link>
      <h1 className="text-lg font-bold text-primary" style={{ marginTop: "var(--space-1)" }}>{program.name}</h1>
      <p className="text-xs text-muted">
        {program.weeks.length} semana{program.weeks.length !== 1 ? "s" : ""}
        {program.objective && ` · ${program.objective}`}
        {program.level && ` · ${program.level}`}
      </p>

      {snapshot.status === "not_started" ? (
        <section className="card" style={{ marginTop: "var(--space-3)" }}>
          <p className="text-sm text-secondary">
            Este programa ainda não tem sessões planejadas em andamento. Instancie-o no Planner para começar a acompanhar o progresso.
          </p>
        </section>
      ) : (
        <>
          <section className="card" style={{ marginTop: "var(--space-3)" }}>
            <h3 className="section-label">Progresso</h3>
            <div className="grid grid-cols-3 gap-2" style={{ marginTop: "var(--space-2)" }}>
              <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <span className="text-xs text-muted">Semana atual</span>
                <div className="text-sm font-semibold text-primary">
                  {currentWeek ? `${currentWeek.weekNumber} de ${program.weeks.length}` : "—"}
                </div>
              </div>
              <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <span className="text-xs text-muted">Sessões concluídas</span>
                <div className="text-sm font-semibold text-primary">{snapshot.completedSessions}/{snapshot.plannedSessions}</div>
              </div>
              <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <span className="text-xs text-muted">Restantes</span>
                <div className="text-sm font-semibold text-primary">{Math.max(0, remainingSessions)}</div>
              </div>
              <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <span className="text-xs text-muted">Adesão acumulada</span>
                <div className="text-sm font-semibold text-primary">{formatPct(snapshot.adherenceRate)} — {adherenceRateLabel(snapshot.adherenceRate)}</div>
              </div>
              <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <span className="text-xs text-muted">Pontualidade</span>
                <div className="text-sm font-semibold text-primary">{formatPct(onTimeRate)}</div>
              </div>
              <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <span className="text-xs text-muted">Previsão</span>
                <div className="text-sm font-semibold text-primary">
                  {remainingWeeks !== undefined && remainingWeeks > 0 ? `~${remainingWeeks} semana(s) restante(s)` : "última semana"}
                </div>
              </div>
            </div>
            {nextWorkout && (
              <Link href={`/plano/treino/${nextWorkout.id}`} className="text-xs text-secondary" style={{ marginTop: "var(--space-3)", display: "block" }}>
                Próximo treino: {nextWorkout.name} · {nextWorkout.date}
              </Link>
            )}
          </section>

          <section className="card" style={{ marginTop: "var(--space-3)" }}>
            <h3 className="section-label">Adesão por semana</h3>
            <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
              {snapshot.weekSummaries.map((week) => (
                <div key={week.weekId} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Semana {week.weekNumber}</span>
                    <span className="badge-pill badge-pill--level">{WEEK_DATA_STATUS_LABELS[week.dataStatus]}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {week.completedSessions}/{week.plannedSessions} concluídas
                    {week.partialSessions > 0 && ` · ${week.partialSessions} parcial(is)`}
                    {week.skippedSessions > 0 && ` · ${week.skippedSessions} ignorada(s)`}
                    {week.cancelledSessions > 0 && ` · ${week.cancelledSessions} cancelada(s)`}
                    {week.extraSessions > 0 && ` · ${week.extraSessions} extra(s)`}
                    {week.adherenceRate !== undefined && ` · ${formatPct(week.adherenceRate)} adesão`}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {snapshot.blockSummaries.length > 0 && (
            <section className="card" style={{ marginTop: "var(--space-3)" }}>
              <h3 className="section-label">Blocos de treino</h3>
              <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
                {snapshot.blockSummaries.map((block) => (
                  <div key={block.blockId} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                    <span className="text-sm font-semibold text-primary">{block.blockName}</span>
                    <div className="text-xs text-muted">
                      {block.completedSessions}/{block.plannedSessions} concluídas
                      {block.adherenceRate !== undefined && ` · ${formatPct(block.adherenceRate)} adesão`}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="card" style={{ marginTop: "var(--space-3)" }}>
        <h3 className="section-label">Carga e distribuição muscular</h3>
        <p className="text-sm text-secondary" style={{ marginTop: "var(--space-1)" }}>
          Gráficos de tendência de carga e grupos musculares mais/menos trabalhados já existem em Insights e não são
          duplicados aqui.
        </p>
        <Link href="/insights" className="btn btn--ghost" style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)" }}>
          Ver Insights
        </Link>
      </section>
    </div>
  )
}
