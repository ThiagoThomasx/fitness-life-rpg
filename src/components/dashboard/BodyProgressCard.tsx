"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getBodyProgressEntries } from "@/lib/body-progress"
import { summarizeWeightTrend, type BodyMetricSummary } from "@/lib/body-progress-trends"

const TREND_LABELS: Record<BodyMetricSummary["trend"], string> = {
  increasing: "Peso aumentando",
  stable: "Peso estável",
  decreasing: "Peso reduzindo",
  irregular: "Peso oscilando",
  insufficient_data: "Dados insuficientes ainda",
}

function daysSince(dateIso: string): number {
  const ms = Date.now() - new Date(dateIso + "T12:00:00").getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

export function BodyProgressCard() {
  const [weightSummary, setWeightSummary] = useState<BodyMetricSummary | null>(null)
  const [lastRecordedAt, setLastRecordedAt] = useState<string | null>(null)
  const [entryCount, setEntryCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const entries = getBodyProgressEntries()
    setEntryCount(entries.length)
    if (entries.length > 0) {
      setLastRecordedAt(entries[entries.length - 1].recordedAt)
      setWeightSummary(summarizeWeightTrend(entries))
    }
  }, [])

  if (entryCount === 0) {
    return (
      <section className="card card--sm" aria-label="Progresso corporal">
        <div className="section-label" style={{ marginBottom: 6 }}>Progresso corporal</div>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
          Registre peso e medidas para acompanhar sua evolução ao longo do tempo.
        </p>
        <button className="btn btn--secondary" onClick={() => router.push("/perfil")} style={{ width: "100%" }}>
          Registrar
        </button>
      </section>
    )
  }

  return (
    <section className="card card--sm" aria-label="Progresso corporal">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 2 }}>Progresso corporal</div>
          {weightSummary?.latestValue !== undefined ? (
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {weightSummary.latestValue.toFixed(1)} kg
            </div>
          ) : (
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>
              Sem peso registrado
            </div>
          )}
        </div>
        <button className="btn btn--ghost" onClick={() => router.push("/perfil")} style={{ fontSize: "0.7rem", padding: "4px 10px" }}>
          Registrar
        </button>
      </div>

      {lastRecordedAt && (
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 8 }}>
          Último registro há {daysSince(lastRecordedAt)} dias
        </div>
      )}

      {weightSummary && (
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 6 }}>
          {TREND_LABELS[weightSummary.trend]}
        </div>
      )}
    </section>
  )
}
