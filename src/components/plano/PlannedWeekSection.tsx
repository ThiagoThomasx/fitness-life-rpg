"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  getPlannedWorkoutsByDateRange,
  updatePlannedWorkoutStatus,
  type PlannedWorkout,
} from "@/lib/planned-workouts"
import { WEEKDAY_LABELS, type Weekday } from "@/lib/training-programs"

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
  done: "Concluído",
  skipped: "Pulado",
}

/**
 * Planner mínimo (Sprint 20 — Parte 1): lista as sessões planejadas da
 * semana atual. Sem execução real de treino a partir daqui — isso fica
 * para uma parte futura da Sprint 20.
 */
export function PlannedWeekSection() {
  const [items, setItems] = useState<PlannedWorkout[]>([])

  useEffect(() => {
    const { start, end } = currentWeekRange()
    setItems(getPlannedWorkoutsByDateRange(start, end))
  }, [])

  function cycleStatus(item: PlannedWorkout) {
    const next: PlannedWorkout["status"] = item.status === "pending" ? "done" : item.status === "done" ? "skipped" : "pending"
    const updated = updatePlannedWorkoutStatus(item.id, next)
    if (updated) setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
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
            <button
              key={item.id}
              type="button"
              className="target-card"
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => cycleStatus(item)}
              aria-label={`${item.name} em ${item.date}, status ${STATUS_LABELS[item.status]}. Clique para alternar status.`}
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
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
