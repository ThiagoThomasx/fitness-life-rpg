"use client"

import { useRouter } from "next/navigation"
import { useSessionStore } from "@/stores/useSessionStore"
import { MOCK_WORKOUTS, type MockWorkout } from "@/lib/mock/data"
import { categoryColor } from "@/lib/theme-colors"
import { EmptyState } from "@/components/ui/EmptyState"
import type { WorkoutSession } from "@/types/database"

function WorkoutCard({ workout, onStart }: { workout: MockWorkout; onStart: () => void }) {
  const colors = categoryColor(workout.workout_type.category)

  return (
    <article className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ height: 3, background: colors.fill }} />
      <div style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
          <span style={{ fontSize: "1.125rem" }} aria-hidden="true">{workout.workout_type.icon ?? "🏋️"}</span>
          <span
            className="badge-pill"
            style={{
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {workout.workout_type.name}
          </span>
        </div>
        <h3 style={{
          fontSize: "var(--text-base)",
          fontWeight: "var(--font-bold)",
          color: "var(--color-text-primary)",
          marginBottom: "0.5rem",
        }}>
          {workout.name}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
          {workout.exercises.map((ex) => (
            <span
              key={ex.id}
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
                background: "var(--color-bg-highlight)",
                padding: "2px 0.5rem",
                borderRadius: 6,
              }}
            >
              {ex.name}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            +{workout.workout_type.base_xp} XP base · {workout.exercises.length} exercícios
          </span>
          <button
            className="btn btn--primary"
            onClick={onStart}
            aria-label={`Iniciar treino ${workout.name}`}
          >
            Iniciar
          </button>
        </div>
      </div>
    </article>
  )
}

export default function TreinosPage() {
  const router = useRouter()
  const { startSession, addExercise, activeSession } = useSessionStore()

  function handleStart(workout: MockWorkout) {
    const session: WorkoutSession = {
      id: `session-${Date.now()}`,
      workout_id: workout.id,
      user_id: "mock-user-id",
      started_at: new Date().toISOString(),
      completed_at: null,
      xp_earned: 0,
      intensity_multiplier: 1,
      notes: null,
    }
    startSession(session)
    for (const ex of workout.exercises) {
      addExercise(ex)
    }
    router.push("/sessao")
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
          Meus Treinos
        </h2>
        {activeSession && (
          <button
            className="btn btn--ghost"
            onClick={() => router.push("/sessao")}
            style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.875rem", borderRadius: 9999 }}
          >
            ▶ Sessão Ativa
          </button>
        )}
      </div>

      {MOCK_WORKOUTS.length === 0 ? (
        <EmptyState
          icon="🏋️"
          title="Nenhum treino disponível"
          description="Adicione treinos para começar sua jornada."
        />
      ) : (
        MOCK_WORKOUTS.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} onStart={() => handleStart(workout)} />
        ))
      )}
    </div>
  )
}
