"use client"

import { getWeeklyAggregateStats } from "@/lib/training-load"

interface WeeklyStatsSectionProps {
  weeksBack?: number
}

export function WeeklyStatsSection({ weeksBack = 12 }: WeeklyStatsSectionProps) {
  const stats = getWeeklyAggregateStats(weeksBack)

  if (stats.weeksWithData === 0) return null

  return (
    <section className="card card--sm">
      <h3 className="section-label">Média semanal de treino</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <StatItem
          label="Treinos / semana"
          value={`${stats.averageSessionsPerWeek}`.replace(".", ",")}
        />
        {stats.averageVolumeKgPerWeek > 0 && (
          <StatItem
            label="Volume médio"
            value={`${stats.averageVolumeKgPerWeek.toLocaleString("pt-BR")} kg`}
          />
        )}
        {stats.averageCompletionRate > 0 && (
          <StatItem
            label="Taxa de conclusão"
            value={`${stats.averageCompletionRate}%`}
          />
        )}
        {stats.mostTrainedMuscleGroupLabel && (
          <StatItem
            label="Grupo mais treinado"
            value={stats.mostTrainedMuscleGroupLabel}
          />
        )}
        {stats.totalFreeSessionsAllTime > 0 && (
          <StatItem
            label="Treinos livres"
            value={String(stats.totalFreeSessionsAllTime)}
          />
        )}
        <StatItem
          label="Semanas com dados"
          value={String(stats.weeksWithData)}
        />
      </div>

      <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
        Baseado nas últimas {weeksBack} semanas.
      </div>
    </section>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.9rem", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}
