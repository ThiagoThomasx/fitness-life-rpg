"use client"

import { useState } from "react"
import { comparePeriods, type PeriodSummary } from "@/lib/body-progress-trends"
import type { BodyProgressEntry } from "@/lib/body-progress"
import { ChartHeader, EmptyChart } from "./ChartCard"

type WindowOption = 30 | 90

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function buildRanges(windowDays: WindowOption) {
  const today = isoDaysAgo(0)
  const windowStart = isoDaysAgo(windowDays - 1)
  const previousEnd = isoDaysAgo(windowDays)
  const previousStart = isoDaysAgo(windowDays * 2 - 1)
  return {
    current: { startDate: windowStart, endDate: today },
    previous: { startDate: previousStart, endDate: previousEnd },
  }
}

function PeriodBlock({ title, summary }: { title: string; summary: PeriodSummary }) {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
        {summary.weightAverage !== undefined ? `${summary.weightAverage.toFixed(1)} kg (média)` : "Sem peso registrado"}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
        {summary.entryCount} registro{summary.entryCount !== 1 ? "s" : ""}
      </div>
    </div>
  )
}

interface Props {
  entries: BodyProgressEntry[]
}

export function BodyPeriodComparisonCard({ entries }: Props) {
  const [windowDays, setWindowDays] = useState<WindowOption>(30)

  if (entries.length === 0) {
    return (
      <section className="card">
        <ChartHeader title="Comparar períodos" description="Compare seu progresso corporal entre dois intervalos" />
        <EmptyChart icon="🗓️" title="Sem registros ainda" description="Adicione registros no Perfil para comparar períodos" />
      </section>
    )
  }

  const ranges = buildRanges(windowDays)
  const comparison = comparePeriods(entries, ranges.current, ranges.previous)

  return (
    <section className="card">
      <ChartHeader title="Comparar períodos" description="Nenhum período é indicado como melhor — apenas descrito" />

      <div style={{ display: "flex", gap: 6, marginBottom: "0.75rem" }}>
        {([30, 90] as WindowOption[]).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setWindowDays(opt)}
            style={{
              padding: "4px 10px", borderRadius: 9999,
              border: "1px solid", borderColor: windowDays === opt ? "var(--color-accent)" : "var(--color-border-subtle)",
              background: windowDays === opt ? "var(--color-accent-subtle)" : "transparent",
              color: windowDays === opt ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Últimos {opt} dias
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <PeriodBlock title={`Últimos ${windowDays} dias`} summary={comparison.periodA} />
        <PeriodBlock title={`${windowDays} dias anteriores`} summary={comparison.periodB} />
      </div>
    </section>
  )
}
