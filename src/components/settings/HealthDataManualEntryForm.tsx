"use client"

import { useState } from "react"
import { createManualHealthRecord } from "@/lib/health-data"
import type { HealthMetricType } from "@/lib/health-data"

// Bem-estar (wellness_energy/soreness/motivation) já é coletado pelo check-in
// de Readiness (`readiness-check-ins.ts`) — não duplicado aqui (Sprint 28
// Parte 2, ver `HEALTH-DATA-MANUAL-ENTRY.md`).
const METRIC_OPTIONS: { value: HealthMetricType; label: string }[] = [
  { value: "steps", label: "Passos" },
  { value: "sleep_duration", label: "Sono (duração)" },
  { value: "sleep_quality", label: "Qualidade do sono" },
  { value: "resting_heart_rate", label: "Frequência cardíaca de repouso" },
  { value: "weight", label: "Peso" },
  { value: "active_calories", label: "Calorias ativas" },
  { value: "activity_duration", label: "Duração de atividade" },
  { value: "distance", label: "Distância" },
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time || "00:00"}`).toISOString()
}

type Props = {
  onSaved: () => void
  onCancel?: () => void
}

export function HealthDataManualEntryForm({ onSaved, onCancel }: Props) {
  const [metric, setMetric] = useState<HealthMetricType>("steps")
  const [value, setValue] = useState<number | "">("")
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg")
  const [distanceUnit, setDistanceUnit] = useState<"km" | "m" | "mi">("km")
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes")
  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState(nowTime())
  const [sleepStart, setSleepStart] = useState(`${todayIso()}T23:00`)
  const [sleepEnd, setSleepEnd] = useState(`${todayIso()}T07:00`)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ metric: HealthMetricType; value: number; unit?: string; quality?: string; redirected?: boolean } | null>(null)

  const isSleepDuration = metric === "sleep_duration"

  function resetValueFields() {
    setValue("")
    setError(null)
    setResult(null)
  }

  function handleMetricChange(next: HealthMetricType) {
    setMetric(next)
    resetValueFields()
  }

  function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      if (isSleepDuration) {
        const startAt = new Date(sleepStart).toISOString()
        const endAt = new Date(sleepEnd).toISOString()
        const durationMinutes = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000)
        const outcome = createManualHealthRecord({
          metric: "sleep_duration",
          value: durationMinutes,
          recordedAt: endAt,
          startAt,
          endAt,
          source: "manual",
          metadata: notes.trim() ? { notes: notes.trim() } : undefined,
        })
        if (!outcome.ok) {
          setError(outcome.errors?.join(" ") ?? "Falha ao salvar.")
          return
        }
        setResult({ metric: "sleep_duration", value: outcome.value ?? durationMinutes, unit: outcome.unit })
        onSaved()
        return
      }

      if (value === "") {
        setError("Informe um valor.")
        return
      }

      const unit = metric === "weight" ? weightUnit : metric === "distance" ? distanceUnit : metric === "activity_duration" ? durationUnit : undefined

      const outcome = createManualHealthRecord({
        metric,
        value,
        unit,
        recordedAt: combineDateTime(date, time),
        source: "manual",
        metadata: notes.trim() ? { notes: notes.trim() } : undefined,
      })

      if (!outcome.ok) {
        setError(outcome.errors?.join(" ") ?? "Falha ao salvar.")
        return
      }

      setResult({
        metric,
        value: outcome.value ?? value,
        unit: outcome.unit,
        quality: outcome.quality,
        redirected: outcome.redirectedToBodyProgress,
      })
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Adicionar registro manual</h3>

      <label style={labelStyle} htmlFor="health-metric">Métrica</label>
      <select
        id="health-metric"
        value={metric}
        onChange={(e) => handleMetricChange(e.target.value as HealthMetricType)}
        style={inputStyle}
      >
        {METRIC_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {isSleepDuration ? (
        <>
          <label style={{ ...labelStyle, marginTop: "0.875rem" }} htmlFor="health-sleep-start">Início do sono</label>
          <input
            id="health-sleep-start"
            type="datetime-local"
            value={sleepStart}
            onChange={(e) => setSleepStart(e.target.value)}
            style={inputStyle}
          />
          <label style={{ ...labelStyle, marginTop: "0.875rem" }} htmlFor="health-sleep-end">Fim do sono</label>
          <input
            id="health-sleep-end"
            type="datetime-local"
            value={sleepEnd}
            onChange={(e) => setSleepEnd(e.target.value)}
            aria-describedby="health-sleep-duration-hint"
            style={inputStyle}
          />
          <p id="health-sleep-duration-hint" style={hintStyle}>
            A duração é calculada automaticamente a partir do intervalo — não precisa somar as horas.
          </p>
        </>
      ) : (
        <>
          <label style={{ ...labelStyle, marginTop: "0.875rem" }} htmlFor="health-value">
            Valor {metric === "sleep_quality" ? "(1 a 5)" : ""}
          </label>
          <input
            id="health-value"
            type="number"
            min={metric === "sleep_quality" ? 1 : 0}
            max={metric === "sleep_quality" ? 5 : undefined}
            step={metric === "steps" || metric === "sleep_quality" ? 1 : 0.1}
            value={value}
            onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
            aria-describedby="health-value-hint"
            style={inputStyle}
          />
          <p id="health-value-hint" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
            Valores fora da faixa plausível serão rejeitados ao salvar.
          </p>

          {metric === "weight" && (
            <>
              <label style={{ ...labelStyle, marginTop: "0.625rem" }} htmlFor="health-weight-unit">Unidade</label>
              <select id="health-weight-unit" value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")} style={inputStyle}>
                <option value="kg">Quilogramas (kg)</option>
                <option value="lb">Libras (lb)</option>
              </select>
              <p style={hintStyle}>Peso é salvo em Progresso Corporal — não cria um segundo histórico.</p>
            </>
          )}

          {metric === "distance" && (
            <>
              <label style={{ ...labelStyle, marginTop: "0.625rem" }} htmlFor="health-distance-unit">Unidade</label>
              <select id="health-distance-unit" value={distanceUnit} onChange={(e) => setDistanceUnit(e.target.value as "km" | "m" | "mi")} style={inputStyle}>
                <option value="km">Quilômetros (km)</option>
                <option value="m">Metros (m)</option>
                <option value="mi">Milhas (mi)</option>
              </select>
            </>
          )}

          {metric === "activity_duration" && (
            <>
              <label style={{ ...labelStyle, marginTop: "0.625rem" }} htmlFor="health-duration-unit">Unidade</label>
              <select id="health-duration-unit" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as "minutes" | "hours")} style={inputStyle}>
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
              </select>
            </>
          )}

          <label style={{ ...labelStyle, marginTop: "0.875rem" }} htmlFor="health-date">Data</label>
          <input id="health-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />

          <label style={{ ...labelStyle, marginTop: "0.625rem" }} htmlFor="health-time">Horário</label>
          <input id="health-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
        </>
      )}

      <label style={{ ...labelStyle, marginTop: "0.875rem" }} htmlFor="health-notes">Observação (opcional)</label>
      <textarea
        id="health-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={200}
        rows={2}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
      />

      {error && (
        <p role="alert" aria-live="assertive" style={{ fontSize: "0.75rem", color: "var(--color-danger)", marginTop: "0.625rem" }}>
          {error}
        </p>
      )}

      {result && (
        <p role="status" aria-live="polite" style={{ fontSize: "0.75rem", color: "var(--color-accent)", marginTop: "0.625rem" }}>
          ✓ Salvo: {result.value}{result.unit ? ` ${result.unit}` : ""}
          {result.quality ? ` · qualidade ${result.quality}` : ""}
          {result.redirected ? " · salvo em Progresso Corporal" : ""}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ flex: 1 }}
        >
          {submitting ? "Salvando…" : "Salvar registro"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} style={{ flex: 1 }}>
            Fechar
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

const hintStyle: React.CSSProperties = {
  fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
  border: "1px solid var(--color-border-subtle)",
  background: "var(--color-bg-subtle)",
  color: "var(--color-text-primary)", fontSize: "var(--text-sm)",
  outline: "none", boxSizing: "border-box",
}
