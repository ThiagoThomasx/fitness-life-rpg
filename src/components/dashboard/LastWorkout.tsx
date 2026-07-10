"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
      <section className="card card--dashed flex flex-col items-center gap-3 text-center">
        <span className="text-3xl" aria-hidden="true">🏋️</span>
        <p className="text-sm text-muted">Nenhum treino registrado ainda.</p>
        <button onClick={() => router.push("/treinos")} className="btn btn--primary">
          Iniciar primeiro treino
        </button>
      </section>
    )
  }

  const totalSets = last.exercises.reduce((acc, e) => acc + e.sets.length, 0)

  return (
    <section className="card overflow-hidden" style={{ padding: 0 }}>
      <div style={{ height: 3, background: last.workoutColor }} aria-hidden="true" />
      <div style={{ padding: "var(--space-4) var(--space-5)" }}>
        <div className="section-label" style={{ marginBottom: "var(--space-1)" }}>Último treino</div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="mb-1 truncate text-base font-bold text-primary">{last.workoutName}</h3>
            <div className="text-xs text-muted">{formatDate(last.completedAt)}</div>
          </div>
          <div
            className="flex-shrink-0 rounded-control px-3 py-1.5 text-center"
            style={{ background: "var(--color-accent-subtle)", border: "1px solid var(--color-accent-border)" }}
          >
            <div className="numeric text-base font-bold" style={{ color: "var(--color-accent)" }}>
              +{last.xpEarned}
            </div>
            <div className="text-[0.65rem] text-muted">XP</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4">
          <span className="numeric text-xs text-secondary">⏱ {formatDuration(last.durationSeconds)}</span>
          <span className="numeric text-xs text-secondary">💪 {totalSets} séries</span>
          {last.prsCount > 0 && (
            <span className="numeric text-xs font-bold" style={{ color: "var(--color-streak)" }}>
              🏆 {last.prsCount} PR{last.prsCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <Link href="/treinos" className="mt-3 inline-block text-xs font-semibold no-underline" style={{ color: "var(--color-accent)" }}>
          Ver treinos →
        </Link>
      </div>
    </section>
  )
}
