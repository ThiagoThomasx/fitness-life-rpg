"use client"

import { useState } from "react"
import type { Exercise } from "@/types/database"
import {
  TRAINING_GOAL_TYPE_LABELS,
  PERSONAL_RECORD_TYPE_LABELS,
  validateGoalInput,
  type TrainingGoalType,
  type NewTrainingGoalInput,
  type PersonalRecordType,
} from "@/lib/training-goals"
import { getTrainingCycles } from "@/lib/training-cycles"
import { ExercisePickerModal } from "@/components/session/ExercisePickerModal"

const TYPE_OPTIONS = Object.keys(TRAINING_GOAL_TYPE_LABELS) as TrainingGoalType[]
const RECORD_TYPE_OPTIONS = Object.keys(PERSONAL_RECORD_TYPE_LABELS) as PersonalRecordType[]

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
  const [targetWeeklyVolumeKg, setTargetWeeklyVolumeKg] = useState<number | "">("")
  const [consecutiveWeeks, setConsecutiveWeeks] = useState(false)
  const [cycleId, setCycleId] = useState("")
  const [recordType, setRecordType] = useState<PersonalRecordType>("weight")
  const [startDate, setStartDate] = useState(todayIso())
  const [targetDate, setTargetDate] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const cycles = getTrainingCycles()

  function buildInput(): NewTrainingGoalInput {
    return {
      title,
      type,
      startDate,
      targetDate: targetDate || undefined,
      exerciseId: isExerciseType(type) || type === "personal_record" ? exercise?.id : undefined,
      exerciseName: isExerciseType(type) || type === "personal_record" ? exercise?.name : undefined,
      targetValue: targetValue === "" ? undefined : targetValue,
      targetReps: targetReps === "" ? undefined : targetReps,
      targetWeeks: targetWeeks === "" ? undefined : targetWeeks,
      targetWeeklyVolumeKg: targetWeeklyVolumeKg === "" ? undefined : targetWeeklyVolumeKg,
      consecutiveWeeks: type === "weekly_volume" ? consecutiveWeeks : undefined,
      cycleId: type === "cycle_completion" ? cycleId || undefined : undefined,
      recordType: type === "personal_record" ? recordType : undefined,
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

      {type === "weekly_volume" && (
        <>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Volume semanal-alvo (kg)</label>
              <input
                type="number"
                min={1}
                step={50}
                value={targetWeeklyVolumeKg}
                onChange={(e) => setTargetWeeklyVolumeKg(e.target.value === "" ? "" : Number(e.target.value))}
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
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "0.625rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            <input type="checkbox" checked={consecutiveWeeks} onChange={(e) => setConsecutiveWeeks(e.target.checked)} />
            Exigir semanas consecutivas (em vez de acumuladas)
          </label>
        </>
      )}

      {type === "cycle_completion" && (
        <>
          <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Ciclo</label>
          <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} style={inputStyle}>
            <option value="">Selecionar ciclo…</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </>
      )}

      {type === "personal_record" && (
        <>
          <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Exercício</label>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}
          >
            {exercise ? exercise.name : "Selecionar exercício…"}
          </button>

          <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Tipo de recorde</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {RECORD_TYPE_OPTIONS.map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => setRecordType(rt)}
                style={{
                  padding: "4px 10px", borderRadius: 9999,
                  border: "1px solid", borderColor: recordType === rt ? "var(--color-accent)" : "var(--color-border-subtle)",
                  background: recordType === rt ? "var(--color-accent-subtle)" : "transparent",
                  color: recordType === rt ? "var(--color-accent)" : "var(--color-text-muted)",
                  fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                {PERSONAL_RECORD_TYPE_LABELS[rt]}
              </button>
            ))}
          </div>
        </>
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
