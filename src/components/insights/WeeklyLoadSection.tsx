"use client"

import { getWeekSummaries } from "@/lib/training-load"
import type { TrainingWeek, WeekSummary, MuscleGroupWeeklyLoad } from "@/lib/training-load"

// ─── Bar chart for muscle group volume ───────────────────────────────────────

function MuscleGroupBar({ load, maxVolume }: { load: MuscleGroupWeeklyLoad; maxVolume: number }) {
  const pct = maxVolume > 0 ? (load.totalVolumeKg / maxVolume) * 100 : 0
  const hasData = load.completedSessions > 0

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
      <div style={{ width: 52, fontSize: "0.7rem", color: "var(--color-text-muted)", flexShrink: 0, textAlign: "right" }}>
        {load.label}
      </div>
      <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "var(--color-bg-subtle)", overflow: "hidden" }}>
        {hasData && (
          <div
            style={{
              height: "100%", borderRadius: 9999,
              background: load.concentrationWarning ? "var(--color-danger, #ef4444)" : "var(--color-accent)",
              width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`,
              transition: "width 0.5s ease",
            }}
          />
        )}
      </div>
      <div style={{ width: 56, fontSize: "0.65rem", color: hasData ? "var(--color-text-secondary)" : "var(--color-text-muted)", textAlign: "right", flexShrink: 0 }}>
        {hasData
          ? load.totalVolumeKg > 0
            ? `${Math.round(load.totalVolumeKg).toLocaleString("pt-BR")} kg`
            : `${load.totalSets} séries`
          : "—"}
      </div>
    </div>
  )
}

// ─── Historical week card ─────────────────────────────────────────────────────

function WeekHistoryCard({ summary, isFirst }: { summary: WeekSummary; isFirst: boolean }) {
  const start = new Date(summary.startDate + "T12:00:00")
  const end = new Date(summary.endDate + "T12:00:00")
  const fmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const label = `${start.toLocaleDateString("pt-BR", fmt)} – ${end.toLocaleDateString("pt-BR", fmt)}`

  return (
    <div style={{
      padding: "0.625rem 0.75rem",
      borderRadius: 10,
      background: "var(--color-bg-subtle)",
      border: isFirst ? "1px solid rgba(200,241,105,0.2)" : "1px solid var(--color-border-subtle)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: "0.7rem", fontWeight: "var(--font-semibold)", color: isFirst ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
          {label}
          {isFirst && <span style={{ marginLeft: 6, fontSize: "0.6rem", opacity: 0.7 }}>esta semana</span>}
        </span>
        {summary.prsCount > 0 && (
          <span style={{ fontSize: "0.65rem", color: "var(--color-accent)" }}>
            🏆 {summary.prsCount} PR{summary.prsCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
          <strong style={{ color: "var(--color-text-primary)" }}>{summary.totalSessions}</strong> treino{summary.totalSessions !== 1 ? "s" : ""}
        </span>
        {summary.totalVolumeKg > 0 && (
          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
            <strong style={{ color: "var(--color-text-primary)" }}>{Math.round(summary.totalVolumeKg).toLocaleString("pt-BR")}</strong> kg
          </span>
        )}
        {summary.totalSets > 0 && (
          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
            <strong style={{ color: "var(--color-text-primary)" }}>{summary.totalSets}</strong> séries
          </span>
        )}
        {summary.adjustedSessions > 0 && (
          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
            {summary.adjustedSessions} com ajuste
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WeeklyLoadSectionProps {
  week: TrainingWeek
}

export function WeeklyLoadSection({ week }: WeeklyLoadSectionProps) {
  const summaries = getWeekSummaries(4)
  const trainedGroups = week.muscleGroups.filter((mg) => mg.completedSessions > 0)
  const maxVolume = Math.max(...week.muscleGroups.map((mg) => mg.totalVolumeKg), 1)

  const hasEnoughData = week.totalCompletedSessions > 0

  // Deterministic insights about the week
  const insights: string[] = []

  if (!hasEnoughData) {
    insights.push("Ainda não há treinos registrados nesta semana.")
  } else {
    const topMg = [...week.muscleGroups]
      .filter((m) => m.totalVolumeKg > 0)
      .sort((a, b) => b.totalVolumeKg - a.totalVolumeKg)[0]

    if (topMg) {
      insights.push(`${topMg.label} recebeu o maior volume da semana.`)
    }

    const untrained = week.muscleGroups
      .filter((m) => m.completedSessions === 0)
      .map((m) => m.label)
    if (untrained.length > 0 && untrained.length <= 4 && trainedGroups.length > 0) {
      insights.push(`${untrained.join(", ")} ainda não ${untrained.length === 1 ? "foi treinado" : "foram treinados"} nesta semana.`)
    }

    const concentrated = week.muscleGroups.filter((m) => m.concentrationWarning)
    if (concentrated.length > 0) {
      insights.push(
        `Seus treinos de ${concentrated.map((m) => m.label.toLowerCase()).join(" e ")} ficaram muito próximos esta semana.`
      )
    }

    if (week.comparison?.volumeChangePct !== null && week.comparison?.volumeChangePct !== undefined) {
      const pct = Math.round(week.comparison.volumeChangePct)
      if (Math.abs(pct) < 10) {
        insights.push("Seu volume semanal está próximo da semana anterior.")
      } else if (pct > 0) {
        insights.push(`Seu volume está ${pct}% acima da semana anterior.`)
      } else {
        insights.push(`Seu volume está ${Math.abs(pct)}% abaixo da semana anterior.`)
      }
    } else if (!week.comparison) {
      insights.push("Ainda não há histórico suficiente para comparar a distribuição.")
    }

    if (week.adherence.freeSessions > 0) {
      insights.push(
        `${week.adherence.freeSessions} treino${week.adherence.freeSessions !== 1 ? "s" : ""} adicional${week.adherence.freeSessions !== 1 ? "is" : ""} fora dos treinos planejados.`
      )
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Volume by muscle group */}
      <section className="card">
        <h3 className="section-label">Volume por grupo muscular</h3>

        {!hasEnoughData ? (
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            Registre treinos para ver a distribuição de volume por grupo muscular.
          </p>
        ) : (
          <>
            {week.muscleGroups.map((mg) => (
              <MuscleGroupBar key={mg.muscleGroup} load={mg} maxVolume={maxVolume} />
            ))}
            <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
              Volume atribuído apenas ao grupo muscular principal de cada exercício.
            </div>
          </>
        )}
      </section>

      {/* Deterministic insights */}
      {insights.length > 0 && (
        <section className="card">
          <h3 className="section-label">Análise semanal</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {insights.map((text, i) => (
              <div
                key={i}
                style={{
                  display: "flex", gap: "0.5rem", alignItems: "flex-start",
                  fontSize: "var(--text-sm)", color: "var(--color-text-secondary)",
                }}
              >
                <span style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 1 }}>→</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Adherence summary */}
      {week.adherence.planned > 0 && (
        <section className="card">
          <h3 className="section-label">Aderência ao plano</h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <StatTile label="Planejadas" value={week.adherence.planned} />
            <StatTile label="Realizadas" value={week.adherence.completedFromPlan + week.adherence.freeSessions} />
            {week.adherence.skipped > 0 && (
              <StatTile label="Puladas" value={week.adherence.skipped} />
            )}
            {week.adherence.freeSessions > 0 && (
              <StatTile label="Adicionais" value={week.adherence.freeSessions} />
            )}
          </div>
        </section>
      )}

      {/* Historical weeks */}
      {summaries.some((s) => s.totalSessions > 0) && (
        <section className="card">
          <h3 className="section-label">Últimas 4 semanas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {summaries.map((s, i) => (
              <WeekHistoryCard key={s.startDate} summary={s} isFirst={i === 0} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      flex: 1, minWidth: 64,
      padding: "0.5rem 0.75rem",
      background: "var(--color-bg-subtle)",
      borderRadius: 8, textAlign: "center",
    }}>
      <div style={{ fontSize: "1.25rem", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}
