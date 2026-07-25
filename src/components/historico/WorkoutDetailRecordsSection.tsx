"use client"

import Link from "next/link"
import type { PersonalRecordEvent } from "@/lib/personal-record-events"
import type { ExerciseRecordType } from "@/lib/exercise-intelligence"

const RECORD_TYPE_LABELS: Record<ExerciseRecordType, string> = {
  max_load: "Novo peso máximo",
  max_reps: "Mais repetições",
  best_set_volume: "Novo volume de série",
  max_session_volume: "Novo volume de sessão",
  max_sets_in_session: "Mais séries na sessão",
}

type WorkoutDetailRecordsSectionProps = {
  recordEvents: PersonalRecordEvent[]
}

/**
 * Personal Record Events da sessão (Sprint 22 Parte 3B). Só renderiza
 * quando há eventos — nenhum estado vazio dedicado, a seção some quando a
 * sessão não bateu nenhum recorde (comportamento igual às demais seções
 * condicionais desta página).
 */
export function WorkoutDetailRecordsSection({ recordEvents }: WorkoutDetailRecordsSectionProps) {
  if (recordEvents.length === 0) return null

  return (
    <section className="card" aria-labelledby="workout-records-title">
      <h2 id="workout-records-title" className="section-label">🏆 Recordes desta sessão</h2>

      <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
        {recordEvents.map((event) => (
          <div key={event.id} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
            <Link href={`/exercicios/${event.exerciseId}`} className="text-sm font-semibold text-primary">
              {event.exerciseName}
            </Link>
            <div className="text-xs text-secondary" style={{ marginTop: "var(--space-1)" }}>
              {RECORD_TYPE_LABELS[event.recordType]} — {event.newValue}
              {event.unit}
              {event.previousValue !== undefined && ` (antes: ${event.previousValue}${event.unit})`}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
