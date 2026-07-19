"use client"

import { useState } from "react"
import type { CycleReviewPhase, ReviewScale, NewCycleReviewInput } from "@/lib/training-cycle-reviews"
import type { CycleWellnessSummary } from "@/lib/training-cycle-wellness"

const PROGRESS_LABELS: Record<ReviewScale, string> = {
  1: "Muito abaixo do esperado",
  2: "Abaixo do esperado",
  3: "Dentro do esperado",
  4: "Bom",
  5: "Muito bom",
}

const RECOVERY_LABELS: Record<ReviewScale, string> = {
  1: "Cansaço na maior parte do tempo",
  2: "Cansaço acima do normal",
  3: "Recuperação dentro do esperado",
  4: "Recuperação boa",
  5: "Recuperação muito boa",
}

const SATISFACTION_LABELS: Record<ReviewScale, string> = {
  1: "Muito insatisfeito",
  2: "Insatisfeito",
  3: "Neutro",
  4: "Satisfeito",
  5: "Muito satisfeito",
}

const SCALE_VALUES: ReviewScale[] = [1, 2, 3, 4, 5]

interface ScaleFieldProps {
  question: string
  labels: Record<ReviewScale, string>
  value: ReviewScale | undefined
  onChange: (value: ReviewScale) => void
}

function ScaleField({ question, labels, value, onChange }: ScaleFieldProps) {
  return (
    <div>
      <label style={labelStyle}>{question}</label>
      <div style={{ display: "flex", gap: 6 }}>
        {SCALE_VALUES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            title={labels[n]}
            style={{
              flex: 1, padding: "0.5rem 0", borderRadius: 8,
              border: "1px solid", borderColor: value === n ? "var(--color-accent)" : "var(--color-border-subtle)",
              background: value === n ? "var(--color-accent-subtle)" : "var(--color-bg-subtle)",
              color: value === n ? "var(--color-accent)" : "var(--color-text-secondary)",
              fontSize: "var(--text-sm)", fontWeight: 700, cursor: "pointer",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {value !== undefined && (
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 4 }}>{labels[value]}</div>
      )}
    </div>
  )
}

interface CycleReviewFormProps {
  cycleId: string
  phase: CycleReviewPhase
  title?: string
  wellnessSummary?: CycleWellnessSummary
  onSubmit: (input: NewCycleReviewInput) => void
  onCancel?: () => void
}

function ReviewWellnessContext({ summary }: { summary: CycleWellnessSummary }) {
  if (summary.checkInCount === 0) return null

  const items: { label: string; value: string }[] = [
    { label: "Check-ins", value: String(summary.checkInCount) },
  ]
  if (summary.averageSleepHours !== undefined) {
    const h = Math.floor(summary.averageSleepHours)
    const m = Math.round((summary.averageSleepHours - h) * 60)
    items.push({ label: "Sono médio", value: `${h}h${String(m).padStart(2, "0")}` })
  }
  if (summary.averageEnergy !== undefined) items.push({ label: "Energia média", value: `${summary.averageEnergy.toFixed(1)}/5` })
  if (summary.averageReadiness !== undefined) items.push({ label: "Prontidão média", value: summary.averageReadiness.toFixed(1) })

  return (
    <div style={{
      padding: "0.625rem 0.75rem", borderRadius: 10, background: "var(--color-bg-subtle)",
      border: "1px solid var(--color-border-subtle)", marginBottom: "0.875rem",
    }}>
      <h4 className="section-label" style={{ marginBottom: 6 }}>Contexto do ciclo</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
        {items.map((item) => (
          <span key={item.label} style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            {item.label}: <strong style={{ color: "var(--color-text-primary)" }}>{item.value}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

export function CycleReviewForm({ cycleId, phase, title = "Registrar revisão", wellnessSummary, onSubmit, onCancel }: CycleReviewFormProps) {
  const [perceivedProgress, setPerceivedProgress] = useState<ReviewScale | undefined>(undefined)
  const [perceivedRecovery, setPerceivedRecovery] = useState<ReviewScale | undefined>(undefined)
  const [satisfaction, setSatisfaction] = useState<ReviewScale | undefined>(undefined)
  const [notes, setNotes] = useState("")

  function handleSubmit() {
    onSubmit({ cycleId, phase, perceivedProgress, perceivedRecovery, satisfaction, notes: notes.trim() || undefined })
  }

  return (
    <section className="card">
      <h3 className="section-label">{title}</h3>

      {wellnessSummary && <ReviewWellnessContext summary={wellnessSummary} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginTop: "0.5rem" }}>
        <ScaleField
          question="Como você avalia seu progresso?"
          labels={PROGRESS_LABELS}
          value={perceivedProgress}
          onChange={setPerceivedProgress}
        />
        <ScaleField
          question="Como está sua recuperação?"
          labels={RECOVERY_LABELS}
          value={perceivedRecovery}
          onChange={setPerceivedRecovery}
        />
        <ScaleField
          question="Qual sua satisfação com esta fase?"
          labels={SATISFACTION_LABELS}
          value={satisfaction}
          onChange={setSatisfaction}
        />

        <div>
          <label style={labelStyle}>Observação (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder="O que você notou nesta fase?"
            style={{
              width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
              border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)",
              color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontFamily: "inherit",
              resize: "vertical", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
        <button className="btn btn--primary" onClick={handleSubmit} style={{ flex: 1 }}>
          Salvar revisão
        </button>
        {onCancel && (
          <button className="btn btn--ghost" onClick={onCancel} style={{ flex: 1 }}>
            Agora não
          </button>
        )}
      </div>
    </section>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500,
  display: "block", marginBottom: 6,
}
