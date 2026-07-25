"use client"

import type { WorkoutReadinessCheckIn } from "@/lib/readiness-check-ins"
import type { WorkoutReadinessResult } from "@/lib/workout-readiness"
import { ReadinessCard } from "@/components/session/ReadinessCard"

type WorkoutDetailReadinessSectionProps = {
  checkIn: WorkoutReadinessCheckIn | null
  readinessResult: WorkoutReadinessResult | null
}

/**
 * Prontidão pré-treino (Sprint 22 Parte 3A §6): energia, motivação, sono
 * (proxy de recuperação) e soreness do check-in, mais o resultado final —
 * reaproveita `ReadinessCard` (já usado na sessão) em vez de duplicar a
 * lógica de rótulos/cores. Estado vazio quando não houve check-in.
 */
export function WorkoutDetailReadinessSection({ checkIn, readinessResult }: WorkoutDetailReadinessSectionProps) {
  if (!checkIn) {
    return (
      <section className="card" aria-labelledby="workout-readiness-title">
        <h2 id="workout-readiness-title" className="section-label">Prontidão</h2>
        <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
          Nenhum check-in de prontidão foi registrado antes desta sessão.
        </p>
      </section>
    )
  }

  return (
    <section className="card" aria-labelledby="workout-readiness-title">
      <h2 id="workout-readiness-title" className="section-label">Prontidão</h2>

      <div className="stat-grid stat-grid--3" style={{ marginTop: "var(--space-2)" }}>
        <div className="stat-cell">
          <div className="stat-cell__label">Energia</div>
          <div className="stat-cell__value">{checkIn.energy}/5</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__label">Motivação</div>
          <div className="stat-cell__value">{checkIn.motivation}/5</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__label">Recuperação (sono)</div>
          <div className="stat-cell__value">{checkIn.sleepQuality}/5</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__label">Soreness</div>
          <div className="stat-cell__value">{checkIn.soreness}/5</div>
        </div>
      </div>

      {readinessResult && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <ReadinessCard result={readinessResult} />
        </div>
      )}
    </section>
  )
}
