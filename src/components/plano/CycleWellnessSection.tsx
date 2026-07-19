"use client"

import { useState } from "react"
import type { CycleWellnessSummary, CycleWellnessTrend } from "@/lib/training-cycle-wellness"
import type { WellnessMetric } from "@/lib/wellness-associations"

const METRIC_LABELS: Record<WellnessMetric, string> = {
  energy: "Energia",
  soreness: "Dor muscular",
  sleepQuality: "Qualidade do sono",
  motivation: "Motivação",
  stress: "Estresse",
  mood: "Humor",
  sleepHours: "Sono",
}

const TREND_LABELS: Record<CycleWellnessTrend["direction"], string> = {
  increasing: "Aumentando",
  stable: "Estável",
  decreasing: "Diminuindo",
  irregular: "Irregular",
  insufficient_data: "Poucos dados",
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h${String(m).padStart(2, "0")}`
}

function formatAverage(metric: WellnessMetric, value: number | undefined): string {
  if (value === undefined) return "—"
  if (metric === "sleepHours") return formatHours(value)
  return `${value.toFixed(1)}/5`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>{label}</div>
    </div>
  )
}

const PRIMARY_METRICS: WellnessMetric[] = ["sleepHours", "energy", "stress", "soreness"]
const DETAIL_METRICS: WellnessMetric[] = ["sleepQuality", "mood", "motivation"]

interface CycleWellnessSectionProps {
  summary: CycleWellnessSummary
  averageReadiness?: number | null
}

export function CycleWellnessSection({ summary, averageReadiness }: CycleWellnessSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (summary.dataStatus === "no_data") {
    return (
      <section className="card">
        <h3 className="section-label">Bem-estar durante o ciclo</h3>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: 6 }}>
          Ainda não há check-ins registrados neste período.
        </p>
      </section>
    )
  }

  const averageByMetric: Partial<Record<WellnessMetric, number | undefined>> = {
    sleepHours: summary.averageSleepHours,
    sleepQuality: summary.averageSleepQuality,
    energy: summary.averageEnergy,
    stress: summary.averageStress,
    soreness: summary.averageSoreness,
    mood: summary.averageMood,
    motivation: summary.averageMotivation,
  }

  const clearTrends = summary.trends.filter((t) => t.direction !== "insufficient_data")

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 className="section-label">Bem-estar durante o ciclo</h3>
        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
          {summary.checkInCount} check-in{summary.checkInCount !== 1 ? "s" : ""}
        </span>
      </div>

      {summary.dataStatus === "partial" && (
        <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 4, fontStyle: "italic" }}>
          Análise parcial — ciclo em andamento ou amostra ainda pequena.
        </p>
      )}

      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.625rem",
          marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        {PRIMARY_METRICS.map((metric) => (
          <Stat key={metric} label={METRIC_LABELS[metric]} value={formatAverage(metric, averageByMetric[metric])} />
        ))}
      </div>

      {averageReadiness !== undefined && averageReadiness !== null && (
        <div style={{ marginTop: "0.625rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
          Prontidão média no período: <strong style={{ color: "var(--color-text-primary)" }}>{averageReadiness.toFixed(1)}</strong>
        </div>
      )}

      <button
        className="btn btn--ghost"
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", marginTop: "0.75rem" }}
      >
        {expanded ? "Ocultar detalhes" : "Ver detalhes"}
      </button>

      {expanded && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem",
            }}
          >
            {DETAIL_METRICS.map((metric) => (
              <Stat key={metric} label={METRIC_LABELS[metric]} value={formatAverage(metric, averageByMetric[metric])} />
            ))}
          </div>

          {clearTrends.length > 0 && (
            <div>
              <h4 className="section-label" style={{ marginBottom: 6 }}>Tendências no ciclo</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {clearTrends.map((trend) => (
                  <div key={trend.metric} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>{METRIC_LABELS[trend.metric]}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>{TREND_LABELS[trend.direction]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.associations.length > 0 && (
            <div>
              <h4 className="section-label" style={{ marginBottom: 6 }}>Associações observadas</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {summary.associations.map((association) => (
                  <div
                    key={association.id}
                    style={{
                      padding: "0.5rem 0.625rem", borderRadius: 8, background: "var(--color-bg-subtle)",
                      fontSize: "0.75rem", color: "var(--color-text-secondary)",
                    }}
                  >
                    {association.summary}.
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {summary.messages.map((message, i) => (
              <p key={i} style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", margin: 0 }}>
                {message}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
