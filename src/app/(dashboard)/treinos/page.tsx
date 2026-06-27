"use client"

import { useRouter } from "next/navigation"
import { useSessionStore } from "@/stores/useSessionStore"
import { MOCK_WORKOUTS, type MockWorkout } from "@/lib/mock/data"
import type { WorkoutSession } from "@/types/database"

const CATEGORY_COLORS: Record<string, string> = {
  strength: "#8b5cf6",
  cardio: "#ef4444",
  agility: "#f59e0b",
  flexibility: "#22c55e",
  dexterity: "#3b82f6",
}

function WorkoutCard({ workout, onStart }: { workout: MockWorkout; onStart: () => void }) {
  const color = CATEGORY_COLORS[workout.workout_type.category] ?? "#6a6a6a"

  return (
    <div
      style={{
        background: "#181818",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
          <span style={{ fontSize: "1.125rem" }}>{workout.workout_type.icon ?? "🏋️"}</span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color,
              background: `${color}22`,
              padding: "2px 0.5rem",
              borderRadius: 9999,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {workout.workout_type.name}
          </span>
        </div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
          {workout.name}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
          {workout.exercises.map((ex) => (
            <span
              key={ex.id}
              style={{
                fontSize: "0.75rem",
                color: "#b3b3b3",
                background: "#282828",
                padding: "2px 0.5rem",
                borderRadius: 6,
              }}
            >
              {ex.name}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.75rem", color: "#6a6a6a" }}>
            +{workout.workout_type.base_xp} XP base · {workout.exercises.length} exercícios
          </span>
          <button
            onClick={onStart}
            style={{
              background: "#1db954",
              color: "#000",
              border: "none",
              borderRadius: 9999,
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Iniciar
          </button>
        </div>
      </div>
    </div>
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
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>Meus Treinos</h2>
        {activeSession && (
          <button
            onClick={() => router.push("/sessao")}
            style={{
              background: "rgba(29,185,84,0.15)",
              color: "#1db954",
              border: "1px solid rgba(29,185,84,0.3)",
              borderRadius: 9999,
              padding: "0.375rem 0.875rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ▶ Sessão Ativa
          </button>
        )}
      </div>

      {MOCK_WORKOUTS.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} onStart={() => handleStart(workout)} />
      ))}
    </div>
  )
}
