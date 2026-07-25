"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  getPlannedWorkoutById,
  skipPlannedWorkout,
  cancelPlannedWorkout,
  reschedulePlannedWorkout,
  startPlannedWorkoutExecution,
  revertPlannedWorkoutToPending,
  type PlannedWorkout,
  type SkippedWorkoutReason,
} from "@/lib/planned-workouts"
import { getWorkoutHistory, type CompletedWorkout } from "@/lib/workout-history"
import {
  resolvedExercisesFromPlannedWorkout,
  buildPlannedPerformedComparison,
} from "@/lib/planned-performed-comparison"
import {
  buildPlannedExecutionSnapshot,
  buildSourceFromPlannedWorkout,
  canStartPlannedWorkout,
  resolveExecutionExercise,
  formatPlannedTargets,
} from "@/lib/active-workout"
import { useSessionStore } from "@/stores/useSessionStore"
import { getAllExercises } from "@/lib/custom-workouts"
import { WEEKDAY_LABELS, type Weekday } from "@/lib/training-programs"
import type { WorkoutSession } from "@/types/database"
import { EmptyState } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SkipPlannedWorkoutDialog } from "@/components/plano/SkipPlannedWorkoutDialog"
import { CancelPlannedWorkoutDialog } from "@/components/plano/CancelPlannedWorkoutDialog"
import { ReschedulePlannedWorkoutDialog } from "@/components/plano/ReschedulePlannedWorkoutDialog"
import { PlannedWorkoutComparisonView } from "@/components/plano/PlannedWorkoutComparisonView"

const STATUS_LABELS: Record<PlannedWorkout["status"], string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluído",
  skipped: "Pulado",
  cancelled: "Cancelado",
}

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function PlannedWorkoutDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { activeSession, startSession, addExercise } = useSessionStore()

  const [workout, setWorkout] = useState<PlannedWorkout | null | undefined>(undefined)
  const [completed, setCompleted] = useState<CompletedWorkout | null>(null)
  const [dialog, setDialog] = useState<"skip" | "cancel" | "reschedule" | "conflict" | null>(null)

  useEffect(() => {
    const found = getPlannedWorkoutById(params.id)
    setWorkout(found)
    if (found?.execution?.completedWorkoutId) {
      const history = getWorkoutHistory()
      setCompleted(history.find((w) => w.id === found.execution?.completedWorkoutId) ?? null)
    }
  }, [params.id])

  if (workout === undefined) return null

  if (workout === null) {
    return (
      <div className="page-container">
        <EmptyState title="Treino planejado não encontrado" description="Ele pode ter sido removido do Planner." />
      </div>
    )
  }

  function reload(updated: PlannedWorkout | null) {
    if (updated) setWorkout(updated)
  }

  function handleStart() {
    const check = canStartPlannedWorkout(workout ?? null, activeSession !== null)
    if (!check.ok && check.reason === "already_active") {
      setDialog("conflict")
      return
    }
    if (!check.ok) return
    launchSession()
  }

  function launchSession() {
    if (!workout) return
    const started = startPlannedWorkoutExecution(workout.id)
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
    router.push("/sessao")
  }

  function confirmDiscardAndStart() {
    setDialog(null)
    const current = useSessionStore.getState()
    if (current.source.plannedWorkoutId) {
      revertPlannedWorkoutToPending(current.source.plannedWorkoutId)
    }
    current.endSession()
    launchSession()
  }

  function handleSkip(reason?: SkippedWorkoutReason, note?: string) {
    setDialog(null)
    reload(skipPlannedWorkout(workout!.id, reason, note))
  }

  function handleCancel(reason?: string) {
    setDialog(null)
    reload(cancelPlannedWorkout(workout!.id, reason))
  }

  function handleReschedule(newDate: string, reason?: string) {
    setDialog(null)
    reload(reschedulePlannedWorkout(workout!.id, newDate, reason))
  }

  const exercises = workout.templateSnapshot.exerciseBlocks
  const isBeforeExecution = workout.status === "pending" || workout.status === "in_progress"
  const comparison =
    workout.status === "done"
      ? buildPlannedPerformedComparison(workout, resolvedExercisesFromPlannedWorkout(workout), completed ?? undefined, todayLocal())
      : null

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <Link href="/plano" className="text-xs text-muted">← Voltar ao Planner</Link>
          <h1 className="text-lg font-bold text-primary" style={{ marginTop: "var(--space-1)" }}>{workout.name}</h1>
          <p className="text-xs text-muted">
            {WEEKDAY_LABELS[workout.weekday as Weekday]} · {workout.date}
            {workout.templateSnapshot.estimatedDurationMinutes && ` · ~${workout.templateSnapshot.estimatedDurationMinutes} min`}
            {workout.isDeload && " · deload"}
            {workout.isOptional && " · opcional"}
          </p>
        </div>
        <span className={`badge-pill ${workout.status === "done" ? "badge-pill--accent" : "badge-pill--level"}`}>
          {STATUS_LABELS[workout.status]}
        </span>
      </div>

      {workout.notes && (
        <p className="text-sm text-secondary" style={{ marginTop: "var(--space-2)" }}>{workout.notes}</p>
      )}

      <section className="card" style={{ marginTop: "var(--space-3)" }}>
        <h3 className="section-label">Exercícios planejados</h3>
        <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
          {exercises.map((block) => (
            <div key={block.id} className="target-card" style={{ cursor: "default", textAlign: "left" }}>
              <span className="text-sm font-semibold text-primary">{block.exercise.exerciseName}</span>
              <div className="text-xs text-muted">
                {formatPlannedTargets({
                  sets: block.exercise.sets,
                  reps: block.exercise.reps,
                  loadKg: block.exercise.loadKg,
                  durationSeconds: block.exercise.durationSeconds,
                  distanceMeters: block.exercise.distanceMeters,
                  restSeconds: block.exercise.restSeconds,
                  rir: block.exercise.rir,
                  rpe: block.exercise.rpe,
                  tempo: block.exercise.tempo,
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isBeforeExecution && (
        <section className="card" style={{ marginTop: "var(--space-3)" }}>
          <h3 className="section-label">Ações</h3>
          <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
            {workout.status === "pending" && (
              <button type="button" className="btn btn--primary" onClick={handleStart}>Iniciar treino</button>
            )}
            {workout.status === "pending" && (
              <>
                <button type="button" className="btn btn--ghost" onClick={() => setDialog("reschedule")}>Reagendar</button>
                <button type="button" className="btn btn--ghost" onClick={() => setDialog("skip")}>Ignorar</button>
                <button type="button" className="btn btn--ghost" onClick={() => setDialog("cancel")}>Cancelar</button>
              </>
            )}
            {workout.status === "in_progress" && (
              <Link href="/sessao" className="btn btn--primary">Continuar sessão ativa</Link>
            )}
          </div>
        </section>
      )}

      {workout.status === "skipped" && workout.execution && (
        <section className="card" style={{ marginTop: "var(--space-3)" }}>
          <h3 className="section-label">Motivo</h3>
          <p className="text-sm text-secondary" style={{ marginTop: "var(--space-1)" }}>
            {workout.execution.skippedNote || "Nenhuma nota registrada."}
          </p>
        </section>
      )}

      {workout.status === "cancelled" && workout.execution && (
        <section className="card" style={{ marginTop: "var(--space-3)" }}>
          <h3 className="section-label">Motivo do cancelamento</h3>
          <p className="text-sm text-secondary" style={{ marginTop: "var(--space-1)" }}>
            {workout.execution.cancellationReason || "Nenhum motivo registrado."}
          </p>
        </section>
      )}

      {comparison && (
        <section className="card" style={{ marginTop: "var(--space-3)" }}>
          <div className="section-header">
            <h3 className="section-label" style={{ marginBottom: 0 }}>Planejado × realizado</h3>
            <Link href="/treinos" className="text-xs text-muted">Ver no histórico</Link>
          </div>
          {workout.execution?.completionTiming && (
            <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
              {{
                on_time: "Realizado na data planejada",
                early: "Realizado antes da data planejada",
                late: "Realizado depois da data planejada",
                rescheduled: "Realizado após remarcação",
                unplanned: "Sem vínculo com o Planner",
              }[workout.execution.completionTiming]}
            </p>
          )}
          <PlannedWorkoutComparisonView comparison={comparison} />
        </section>
      )}

      {dialog === "skip" && (
        <SkipPlannedWorkoutDialog workoutName={workout.name} onConfirm={handleSkip} onCancel={() => setDialog(null)} />
      )}
      {dialog === "cancel" && (
        <CancelPlannedWorkoutDialog workoutName={workout.name} onConfirm={handleCancel} onCancel={() => setDialog(null)} />
      )}
      {dialog === "reschedule" && (
        <ReschedulePlannedWorkoutDialog workout={workout} onConfirm={handleReschedule} onCancel={() => setDialog(null)} />
      )}
      {dialog === "conflict" && (
        <ConfirmDialog
          title="Há uma sessão em andamento"
          description={`Iniciar "${workout.name}" descarta a sessão ativa e as séries registradas nela. Nenhum XP será concedido para ela.`}
          confirmLabel="Descartar e iniciar"
          cancelLabel="Voltar"
          isDanger
          onConfirm={confirmDiscardAndStart}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
