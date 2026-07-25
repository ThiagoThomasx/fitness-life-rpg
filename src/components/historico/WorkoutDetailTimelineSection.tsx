"use client"

import type { CompletedWorkout } from "@/lib/workout-history"
import type { WorkoutReadinessCheckIn } from "@/lib/readiness-check-ins"
import type { PersonalRecordEvent } from "@/lib/personal-record-events"

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

interface TimelineEntry {
  at: string
  label: string
  detail?: string
}

type WorkoutDetailTimelineSectionProps = {
  workout: CompletedWorkout
  checkIn: WorkoutReadinessCheckIn | null
  recordEvents: PersonalRecordEvent[]
}

/**
 * Timeline cronológica da sessão (Sprint 22 Parte 3A §9): check-in → treino →
 * conclusão → recompensas, sempre em ordem de horário real (nunca uma ordem
 * fixa hardcoded — check-in pode não existir, e a lista de recompensas pode
 * ter mais de um item).
 */
export function WorkoutDetailTimelineSection({ workout, checkIn, recordEvents }: WorkoutDetailTimelineSectionProps) {
  const entries: TimelineEntry[] = []

  if (checkIn) entries.push({ at: checkIn.createdAt, label: "Check-in de prontidão" })
  entries.push({ at: workout.startedAt, label: "Início do treino" })
  entries.push({
    at: workout.completedAt,
    label: "Conclusão",
    detail: `${Math.floor(workout.xpEarned)} XP`,
  })
  for (const event of recordEvents) {
    entries.push({ at: event.achievedAt, label: `Recorde: ${event.exerciseName}`, detail: "🏆" })
  }

  entries.sort((a, b) => (a.at < b.at ? -1 : 1))

  return (
    <section className="card" aria-labelledby="workout-timeline-title">
      <h2 id="workout-timeline-title" className="section-label">Linha do tempo</h2>

      <ol className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)", listStyle: "none" }}>
        {entries.map((entry, index) => (
          <li key={index} className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm text-primary">{entry.label}</span>
              {entry.detail && <span className="text-xs text-muted"> — {entry.detail}</span>}
            </div>
            <span className="text-xs text-muted flex-shrink-0">{formatTime(entry.at)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
