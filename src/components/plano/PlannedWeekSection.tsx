"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  getPlannedWorkoutsByDateRange,
  startPlannedWorkoutExecution,
  revertPlannedWorkoutToPending,
  type PlannedWorkout,
} from "@/lib/planned-workouts"
import { WEEKDAY_LABELS, type Weekday } from "@/lib/training-programs"
import { getAllExercises } from "@/lib/custom-workouts"
import {
  buildPlannedExecutionSnapshot,
  buildSourceFromPlannedWorkout,
  canStartPlannedWorkout,
  resolveExecutionExercise,
} from "@/lib/active-workout"
import { useSessionStore } from "@/stores/useSessionStore"
import type { WorkoutSession } from "@/types/database"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { PlannedWorkoutPreviewDialog } from "./PlannedWorkoutPreviewDialog"

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function currentWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: toDateOnly(monday), end: toDateOnly(sunday) }
}

const STATUS_LABELS: Record<PlannedWorkout["status"], string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluído",
  skipped: "Pulado",
  cancelled: "Cancelado",
}

/**
 * Planner (Sprint 20 — Parte 1, execução adicionada na Parte 4A): lista as
 * sessões planejadas da semana atual e permite iniciar uma sessão real a
 * partir de um item pendente. Substituição/extra/pausa durante a execução
 * ficam para a Parte 4B.
 */
export function PlannedWeekSection() {
  const router = useRouter()
  const { activeSession, startSession, addExercise } = useSessionStore()
  const [items, setItems] = useState<PlannedWorkout[]>([])
  const [previewItem, setPreviewItem] = useState<PlannedWorkout | null>(null)
  const [conflictItem, setConflictItem] = useState<PlannedWorkout | null>(null)

  useEffect(() => {
    const { start, end } = currentWeekRange()
    setItems(getPlannedWorkoutsByDateRange(start, end))
  }, [])

  function beginStart(item: PlannedWorkout) {
    setPreviewItem(null)
    setConflictItem(null)

    const check = canStartPlannedWorkout(item, activeSession !== null)
    if (!check.ok && check.reason === "already_active") {
      setConflictItem(item)
      return
    }
    if (!check.ok) return

    launchSession(item)
  }

  function launchSession(item: PlannedWorkout) {
    const started = startPlannedWorkoutExecution(item.id)
    if (!started) return

    const snapshot = buildPlannedExecutionSnapshot(started)
    const source = buildSourceFromPlannedWorkout(started)
    const allExercises = getAllExercises()

    const session: WorkoutSession = {
      id: `session-${Date.now()}`,
      workout_id: started.id,
      user_id: "mock-user-id",
      started_at: new Date().toISOString(),
      completed_at: null,
      xp_earned: 0,
      intensity_multiplier: 1,
      notes: null,
    }
    startSession(session, { source, plannedSnapshot: snapshot })
    for (const exec of snapshot.exercises) {
      addExercise(resolveExecutionExercise(exec, allExercises), {
        source: "planned",
        plannedExerciseId: exec.id,
        plannedTargets: exec.targets,
      })
    }

    setItems((prev) => prev.map((i) => (i.id === started.id ? started : i)))
    router.push("/sessao")
  }

  function confirmDiscardAndStart() {
    if (!conflictItem) return
    const target = conflictItem
    setConflictItem(null)

    // Sessão ativa atual é descartada sem gerar histórico. Se ela também veio
    // do Planner, o item de origem volta a `pending` para não ficar preso em
    // "em andamento" para sempre (Fase 16/23).
    const current = useSessionStore.getState()
    if (current.source.plannedWorkoutId) {
      revertPlannedWorkoutToPending(current.source.plannedWorkoutId)
    }
    current.endSession()
    launchSession(target)
  }

  return (
    <section className="card" aria-labelledby="planned-week-title">
      <div className="section-header">
        <h3 id="planned-week-title" className="section-label" style={{ marginBottom: 0 }}>🗓️ Planner desta semana</h3>
        <Link href="/programas" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }}>
          Ver programas
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
          Nenhuma sessão planejada para esta semana. Instancie um programa para preencher o Planner.
        </p>
      ) : (
        <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
          {items.map((item) => (
            <div key={item.id} className="target-card" style={{ textAlign: "left" }}>
              <Link
                href={`/plano/treino/${item.id}`}
                style={{ textAlign: "left", display: "block", width: "100%" }}
                aria-label={`${item.name} em ${item.date}, status ${STATUS_LABELS[item.status]}. Ver detalhes.`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">{item.name}</span>
                  <span className={`badge-pill ${item.status === "done" ? "badge-pill--accent" : "badge-pill--level"}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {WEEKDAY_LABELS[item.weekday as Weekday]} · {item.date}
                  {item.isOptional && " · opcional"}
                </div>
              </Link>

              {item.status === "pending" && (
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)" }}
                  onClick={() => setPreviewItem(item)}
                >
                  Iniciar sessão
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {previewItem && (
        <PlannedWorkoutPreviewDialog
          workout={previewItem}
          onConfirm={() => beginStart(previewItem)}
          onCancel={() => setPreviewItem(null)}
        />
      )}

      {conflictItem && (
        <ConfirmDialog
          title="Há uma sessão em andamento"
          description={`Iniciar "${conflictItem.name}" descarta a sessão ativa e as séries registradas nela. Nenhum XP será concedido para ela.`}
          confirmLabel="Descartar e iniciar"
          cancelLabel="Voltar"
          isDanger
          onConfirm={confirmDiscardAndStart}
          onCancel={() => setConflictItem(null)}
        />
      )}
    </section>
  )
}
