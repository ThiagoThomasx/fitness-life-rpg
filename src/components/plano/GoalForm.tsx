"use client"

import { useState } from "react"
import type { Exercise } from "@/types/database"
import {
  TRAINING_GOAL_TYPE_LABELS,
  validateGoalInput,
  type TrainingGoalType,
  type NewTrainingGoalInput,
} from "@/lib/training-goals"
import { ExercisePickerModal } from "@/components/session/ExercisePickerModal"

const TYPE_OPTIONS = Object.keys(TRAINING_GOAL_TYPE_LABELS) as TrainingGoalType[]

function isExerciseType(type: TrainingGoalType): boolean {
  return type === "exercise_weight" || type === "exercise_reps" || type === "estimated_1rm"
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface GoalFormProps {
  onSubmit: (input: NewTrainingGoalInput) => void
  onCancel?: () => void
}

export function GoalForm({ onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState("")
  const [type, setType] = useState<TrainingGoalType>("exercise_weight")
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [targetValue, setTargetValue] = useState<number | "">("")
  const [targetReps, setTargetReps] = useState<number | "">("")
  const [targetWeeks, setTargetWeeks] = useState<number | "">(4)
  const [startDate, setStartDate] = useState(todayIso())
  const [targetDate, setTargetDate] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  function buildInput(): NewTrainingGoalInput {
    return {
      title,
      type,
      startDate,
      targetDate: targetDate || undefined,
      exerciseId: exercise?.id,
      exerciseName: exercise?.name,
      targetValue: targetValue === "" ? undefined : targetValue,
      targetReps: targetReps === "" ? undefined : targetReps,
      targetWeeks: targetWeeks === "" ? undefined : targetWeeks,
      notes: notes.trim() || undefined,
    }
  }

  function handleSubmit() {
    const input = buildInput()
    const validationError = validateGoalInput(input)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onSubmit(input)
  }

  return (
    <section className="card">
      <h3 className="section-label">Nova meta</h3>

      <label style={labelStyle}>Título</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex: Supino reto a 60kg"
        maxLength={80}
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Tipo de meta</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              padding: "4px 10px", borderRadius: 9999,
              border: "1px solid", borderColor: type === t ? "var(--color-accent)" : "var(--color-border-subtle)",
              background: type === t ? "var(--color-accent-subtle)" : "transparent",
              color: type === t ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            {TRAINING_GOAL_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {isExerciseType(type) && (
        <>
          <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Exercício</label>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}
          >
            {exercise ? exercise.name : "Selecionar exercício…"}
          </button>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{type === "exercise_reps" ? "Carga-alvo (kg)" : "Meta (kg)"}</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value === "" ? "" : Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            {type === "exercise_reps" && (
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Repetições-alvo</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={targetReps}
                  onChange={(e) => setTargetReps(e.target.value === "" ? "" : Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </>
      )}

      {(type === "weekly_sessions" || type === "consistency") && (
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Sessões por semana</label>
            <input
              type="number"
              min={1}
              step={1}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value === "" ? "" : Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Duração (semanas)</label>
            <input
              type="number"
              min={1}
              max={52}
              step={1}
              value={targetWeeks}
              onChange={(e) => setTargetWeeks(e.target.value === "" ? "" : Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Início</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Data-alvo (opcional)</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={inputStyle} />
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

      {error && (
        <p role="alert" style={{ fontSize: "0.75rem", color: "var(--color-danger)", marginTop: "0.625rem" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
        <button className="btn btn--primary" onClick={handleSubmit} style={{ flex: 1 }}>
          Criar meta
        </button>
        {onCancel && (
          <button className="btn btn--ghost" onClick={onCancel} style={{ flex: 1 }}>
            Cancelar
          </button>
        )}
      </div>

      {showPicker && (
        <ExercisePickerModal
          alreadyAdded={[]}
          onPick={(ex) => setExercise(ex)}
          onClose={() => setShowPicker(false)}
        />
      )}
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
