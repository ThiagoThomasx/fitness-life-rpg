"use client"

import { useState } from "react"
import {
  validateBodyProgressInput,
  type NewBodyProgressInput,
  type BodyMeasurements,
  type MeasurementField,
  type BodyProgressEntry,
} from "@/lib/body-progress"
import { getTrainingCycles } from "@/lib/training-cycles"
import { getFavoriteMeasurements } from "@/lib/preferences"

const MEASUREMENT_LABELS: Record<MeasurementField, string> = {
  waistCm: "Cintura",
  abdomenCm: "Abdômen",
  chestCm: "Peito",
  hipsCm: "Quadril",
  rightArmCm: "Braço direito",
  leftArmCm: "Braço esquerdo",
  rightThighCm: "Coxa direita",
  leftThighCm: "Coxa esquerda",
  rightCalfCm: "Panturrilha direita",
  leftCalfCm: "Panturrilha esquerda",
  neckCm: "Pescoço",
}

const ALL_MEASUREMENT_FIELDS = Object.keys(MEASUREMENT_LABELS) as MeasurementField[]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface BodyProgressFormProps {
  onSubmit: (input: NewBodyProgressInput) => void
  onCancel?: () => void
  /** Quando presente, o formulário abre pré-preenchido para edição em vez de criação. */
  initialEntry?: BodyProgressEntry
}

export function BodyProgressForm({ onSubmit, onCancel, initialEntry }: BodyProgressFormProps) {
  const [recordedAt, setRecordedAt] = useState(initialEntry?.recordedAt ?? todayIso())
  const [weightKg, setWeightKg] = useState<number | "">(initialEntry?.weightKg ?? "")
  const [showMeasurements, setShowMeasurements] = useState(Boolean(initialEntry?.measurements))
  const favorites = getFavoriteMeasurements()
  const initialMeasurementFields = initialEntry?.measurements
    ? (Object.keys(initialEntry.measurements).filter((k) => k !== "custom") as MeasurementField[])
    : []
  const [visibleFields, setVisibleFields] = useState<MeasurementField[]>(
    Array.from(
      new Set([
        ...initialMeasurementFields,
        ...favorites.filter((f): f is MeasurementField => ALL_MEASUREMENT_FIELDS.includes(f as MeasurementField)),
      ])
    )
  )
  const [measurementValues, setMeasurementValues] = useState<Partial<Record<MeasurementField, number | "">>>(
    initialEntry?.measurements
      ? (Object.fromEntries(
          Object.entries(initialEntry.measurements).filter(([k]) => k !== "custom")
        ) as Partial<Record<MeasurementField, number | "">>)
      : {}
  )
  const [notes, setNotes] = useState(initialEntry?.notes ?? "")
  const [cycleId, setCycleId] = useState(initialEntry?.cycleId ?? "")
  const [error, setError] = useState<string | null>(null)
  const cycles = getTrainingCycles()

  function buildMeasurements(): BodyMeasurements | undefined {
    const entries = Object.entries(measurementValues).filter(([, v]) => v !== "" && v !== undefined) as [MeasurementField, number][]
    if (entries.length === 0) return undefined
    return Object.fromEntries(entries) as BodyMeasurements
  }

  function buildInput(): NewBodyProgressInput {
    return {
      recordedAt,
      weightKg: weightKg === "" ? undefined : weightKg,
      measurements: buildMeasurements(),
      notes: notes.trim() || undefined,
      cycleId: cycleId || undefined,
    }
  }

  function handleSubmit() {
    const input = buildInput()
    const validationError = validateBodyProgressInput(input)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onSubmit(input)
  }

  function addMeasurementField(field: MeasurementField) {
    if (!visibleFields.includes(field)) setVisibleFields((prev) => [...prev, field])
  }

  const hiddenFields = ALL_MEASUREMENT_FIELDS.filter((f) => !visibleFields.includes(f))

  return (
    <section className="card">
      <h3 className="section-label">{initialEntry ? "Editar registro" : "Novo registro de progresso corporal"}</h3>

      <label style={labelStyle}>Data</label>
      <input type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} style={inputStyle} />

      <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Peso (kg)</label>
      <input
        type="number"
        min={0.1}
        step={0.1}
        value={weightKg}
        onChange={(e) => setWeightKg(e.target.value === "" ? "" : Number(e.target.value))}
        placeholder="Opcional"
        style={inputStyle}
      />

      <button
        type="button"
        onClick={() => setShowMeasurements((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          background: "transparent", border: "none", cursor: "pointer", padding: "0.875rem 0 0",
        }}
      >
        <span style={labelStyle}>Medidas (opcional)</span>
        <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
          {showMeasurements ? "Ocultar ▲" : "Mostrar ▼"}
        </span>
      </button>

      {showMeasurements && (
        <div style={{ marginTop: "0.5rem" }}>
          {visibleFields.map((field) => (
            <div key={field} style={{ marginTop: "0.625rem" }}>
              <label style={labelStyle}>{MEASUREMENT_LABELS[field]} (cm)</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={measurementValues[field] ?? ""}
                onChange={(e) =>
                  setMeasurementValues((prev) => ({
                    ...prev,
                    [field]: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                style={inputStyle}
              />
            </div>
          ))}

          {hiddenFields.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "0.75rem" }}>
              {hiddenFields.map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => addMeasurementField(field)}
                  style={{
                    padding: "4px 10px", borderRadius: 9999,
                    border: "1px solid var(--color-border-subtle)",
                    background: "transparent", color: "var(--color-text-muted)",
                    fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  + {MEASUREMENT_LABELS[field]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {cycles.length > 0 && (
        <>
          <label style={{ ...labelStyle, marginTop: "0.875rem" }}>Ciclo (opcional)</label>
          <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} style={inputStyle}>
            <option value="">Sem vínculo</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </>
      )}

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
          {initialEntry ? "Salvar alterações" : "Salvar registro"}
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
