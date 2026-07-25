"use client"

import Link from "next/link"
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
    <Link
      href={`/historico/${evidence.workoutId}`}
      className="exercise-record-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <span className="text-xs text-muted">{RECORD_LABELS[evidence.type]}</span>
      <span className="text-base font-bold text-primary">
        {evidence.value}{evidence.unit}
      </span>
      <span className="text-xs text-muted">
        {formatDate(evidence.achievedAt)} · {evidence.workoutName}
      </span>
    </Link>
  )
}

type ExerciseRecordsSectionProps = {
  records: ExercisePersonalRecords
}

/**
 * Recordes pessoais (Sprint 22 §12/§13) — só renderiza os tipos presentes;
 * `getExercisePersonalRecords` já aplica a regra de empate (comparação
 * estrita `>`), então o card mostra sempre o PRIMEIRO valor cronológico a
 * alcançar aquele patamar, nunca uma repetição posterior. Cada card linka
 * para `/historico/[id]` (Sprint 23 part 1) — rota disponível desde a
 * Sprint 22 part 3, que faltava ser conectada aqui.
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
