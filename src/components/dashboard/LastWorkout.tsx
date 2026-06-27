"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getLastWorkout } from "@/lib/workout-history"
import type { CompletedWorkout } from "@/lib/workout-history"

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}min${s > 0 ? ` ${s}s` : ""}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function LastWorkout() {
  const [last, setLast] = useState<CompletedWorkout | null | undefined>(undefined)
  const router = useRouter()

  useEffect(() => {
    setLast(getLastWorkout())
  }, [])

  if (last === undefined) return null

  if (!last) {
    return (
      <section
        style={{
          background: "#181818",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "2rem" }}>🏋️</span>
        <p style={{ color: "#6a6a6a", fontSize: "0.875rem" }}>Nenhum treino registrado ainda.</p>
        <button
          onClick={() => router.push("/treinos")}
          style={{
            background: "#1db954",
            color: "#000",
            border: "none",
            borderRadius: 9999,
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Iniciar primeiro treino
        </button>
      </section>
    )
  }

  return (
    <section
      style={{
        background: "#181818",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: last.workoutColor }} />
      <div style={{ padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: "0.7rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
          Último Treino
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.25rem" }}>
              {last.workoutName}
            </h3>
            <div style={{ fontSize: "0.75rem", color: "#6a6a6a" }}>
              {formatDate(last.completedAt)}
            </div>
          </div>
          <div
            style={{
              background: "rgba(29,185,84,0.1)",
              border: "1px solid rgba(29,185,84,0.2)",
              borderRadius: 10,
              padding: "0.375rem 0.75rem",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#1db954" }}>+{last.xpEarned}</div>
            <div style={{ fontSize: "0.65rem", color: "#6a6a6a" }}>XP</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "0.875rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#b3b3b3" }}>
            ⏱ {formatDuration(last.durationSeconds)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#b3b3b3" }}>
            💪 {last.exercises.reduce((acc, e) => acc + e.sets.length, 0)} séries
          </span>
          {last.prsCount > 0 && (
            <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700 }}>
              🏆 {last.prsCount} PR{last.prsCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
