"use client"

import { useState } from "react"
import { TRAINING_CYCLE_GOAL_LABELS, type TrainingCycleGoal, type NewTrainingCycleInput } from "@/lib/training-cycles"

const GOAL_OPTIONS = Object.keys(TRAINING_CYCLE_GOAL_LABELS) as TrainingCycleGoal[]

interface CycleFormProps {
  onSubmit: (input: NewTrainingCycleInput) => void
  onCancel?: () => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CycleForm({ onSubmit, onCancel }: CycleFormProps) {
  const [name, setName] = useState("")
  const [goal, setGoal] = useState<TrainingCycleGoal>("general")
  const [customGoal, setCustomGoal] = useState("")
  const [startDate, setStartDate] = useState(todayIso())
  const [plannedWeeks, setPlannedWeeks] = useState<number | "">(6)
  const [notes, setNotes] = useState("")

  const canSubmit = name.trim().length > 0

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      goal,
      customGoal: goal === "custom" ? customGoal.trim() : undefined,
      startDate,
      plannedWeeks: plannedWeeks === "" ? undefined : plannedWeeks,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <section className="card">
      <h3 className="section-label">Novo ciclo</h3>

      <label style={labelStyle}>Nome</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Bloco de força — agosto"
        maxLength={60}
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Objetivo</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {GOAL_OPTIONS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGoal(g)}
            style={{
              padding: "4px 10px", borderRadius: 9999,
              border: "1px solid", borderColor: goal === g ? "var(--color-accent)" : "var(--color-border-subtle)",
              background: goal === g ? "var(--color-accent-subtle)" : "transparent",
              color: goal === g ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            {TRAINING_CYCLE_GOAL_LABELS[g]}
          </button>
        ))}
      </div>

      {goal === "custom" && (
        <input
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value)}
          placeholder="Descreva o objetivo"
          maxLength={80}
          style={{ ...inputStyle, marginTop: 8 }}
        />
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Duração (semanas)</label>
          <input
            type="number"
            min={1}
            max={52}
            value={plannedWeeks}
            onChange={(e) => setPlannedWeeks(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Opcional"
            style={inputStyle}
          />
        </div>
      </div>

      <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Observações (opcional)</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={280}
        rows={2}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
        <button className="btn btn--primary" onClick={handleSubmit} disabled={!canSubmit} style={{ flex: 1 }}>
          Criar ciclo
        </button>
        {onCancel && (
          <button className="btn btn--ghost" onClick={onCancel} style={{ flex: 1 }}>
            Cancelar
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

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
  border: "1px solid var(--color-border-subtle)",
  background: "var(--color-bg-subtle)",
  color: "var(--color-text-primary)", fontSize: "var(--text-sm)",
  outline: "none", boxSizing: "border-box",
}
