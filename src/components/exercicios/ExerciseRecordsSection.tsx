"use client"

import type { ExercisePersonalRecords, ExerciseRecordEvidence, ExerciseRecordType } from "@/lib/exercise-intelligence"

const RECORD_LABELS: Record<ExerciseRecordType, string> = {
  max_load: "Maior carga",
  max_reps: "Maior repetições",
  best_set_volume: "Melhor série (volume)",
  max_session_volume: "Maior volume de sessão",
  max_sets_in_session: "Mais séries numa sessão",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function RecordCard({ evidence }: { evidence: ExerciseRecordEvidence }) {
  return (
    <div className="exercise-record-card">
      <span className="text-xs text-muted">{RECORD_LABELS[evidence.type]}</span>
      <span className="text-base font-bold text-primary">
        {evidence.value}{evidence.unit}
      </span>
      <span className="text-xs text-muted">
        {formatDate(evidence.achievedAt)} · {evidence.workoutName}
      </span>
    </div>
  )
}

type ExerciseRecordsSectionProps = {
  records: ExercisePersonalRecords
}

/**
 * Recordes pessoais (Sprint 22 §12/§13) — só renderiza os tipos presentes;
 * `getExercisePersonalRecords` já aplica a regra de empate (comparação
 * estrita `>`), então o card mostra sempre o PRIMEIRO valor cronológico a
 * alcançar aquele patamar, nunca uma repetição posterior.
 *
 * §12 pede "acesso à execução relacionada", mas o projeto não tem uma rota
 * para abrir um `CompletedWorkout` livre por ID (só treinos vindos do
 * Planner têm rota, via `plannedWorkoutId`) — linkar aqui produziria uma
 * rota inexistente. Cards mostram data/treino como texto; pendência
 * documentada em `EXERCISE-DETAIL-EXPERIENCE.md`.
 */
export function ExerciseRecordsSection({ records }: ExerciseRecordsSectionProps) {
  const entries = Object.values(records).filter((r): r is ExerciseRecordEvidence => r !== undefined)

  if (entries.length === 0) {
    return (
      <section className="card" aria-labelledby="exercise-records-title">
        <h2 id="exercise-records-title" className="section-label">Recordes pessoais</h2>
        <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
          Ainda sem recordes registrados para este exercício.
        </p>
      </section>
    )
  }

  return (
    <section className="card" aria-labelledby="exercise-records-title">
      <h2 id="exercise-records-title" className="section-label">Recordes pessoais</h2>
      <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
        {entries.map((evidence) => (
          <RecordCard key={evidence.type} evidence={evidence} />
        ))}
      </div>
    </section>
  )
}
