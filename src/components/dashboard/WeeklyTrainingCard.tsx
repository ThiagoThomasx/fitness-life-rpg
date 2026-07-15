"use client"

import { useEffect, useState } from "react"
import { buildTrainingWeek } from "@/lib/training-load"
import type { TrainingWeek } from "@/lib/training-load"

function VolumeChange({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const sign = pct > 0 ? "+" : ""
  const color = pct > 0 ? "var(--color-accent)" : "var(--color-text-muted)"
  return (
    <span style={{ fontSize: "0.7rem", color, fontWeight: "var(--font-semibold)" }}>
      {sign}{Math.round(pct)}% vs semana anterior
    </span>
  )
}

export function WeeklyTrainingCard() {
  const [week, setWeek] = useState<TrainingWeek | null>(null)

  useEffect(() => {
    setWeek(buildTrainingWeek())
  }, [])

  if (!week) return null

  const topPriority = week.priorities[0]
  const trainedGroups = week.muscleGroups.filter((mg) => mg.completedSessions > 0)
  const untrainedGroups = week.muscleGroups.filter((mg) => mg.completedSessions === 0)

  const volumeLabel = week.completedVolumeKg > 0
    ? `${Math.round(week.completedVolumeKg).toLocaleString("pt-BR")} kg`
    : null

  return (
    <section className="card card--sm" aria-label="Resumo semanal de treino">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
        <div>
          <div className="section-label" style={{ marginBottom: 2 }}>Sua semana</div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
            {week.totalCompletedSessions > 0
              ? week.totalPlannedSessions > 0
                ? `${week.totalCompletedSessions} de ${week.totalPlannedSessions} sessões`
                : `${week.totalCompletedSessions} treino${week.totalCompletedSessions !== 1 ? "s" : ""}`
              : "Nenhum treino registrado"}
          </div>
        </div>

        {week.totalCompletedSessions > 0 && week.totalPlannedSessions > 0 && (
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "var(--color-bg-subtle)",
            border: "2px solid var(--color-border-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", flexShrink: 0,
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} aria-hidden="true">
              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-border-subtle)" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke="var(--color-accent)" strokeWidth="3"
                strokeDasharray={`${week.completionRate * 100.5} 100.5`}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: "0.6rem", fontWeight: "var(--font-bold)", color: "var(--color-accent)", position: "relative" }}>
              {Math.round(week.completionRate * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Volume row */}
      {volumeLabel && (
        <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Volume: <strong style={{ color: "var(--color-text-primary)" }}>{volumeLabel}</strong>
          </span>
          <VolumeChange pct={week.comparison?.volumeChangePct ?? null} />
        </div>
      )}

      {/* Muscle groups trained */}
      {trainedGroups.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", fontWeight: "var(--font-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Grupos treinados
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {trainedGroups.map((mg) => (
              <span
                key={mg.muscleGroup}
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: mg.concentrationWarning
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(200,241,105,0.1)",
                  border: `1px solid ${mg.concentrationWarning
                    ? "rgba(239,68,68,0.3)"
                    : "rgba(200,241,105,0.25)"}`,
                  color: mg.concentrationWarning
                    ? "var(--color-danger, #ef4444)"
                    : "var(--color-accent)",
                  fontWeight: "var(--font-medium)",
                }}
              >
                {mg.label}
                {mg.concentrationWarning && " ⚠"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Untrained groups (only if there are trained ones too — not useful if nothing was done) */}
      {trainedGroups.length > 0 && untrainedGroups.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", fontWeight: "var(--font-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Ainda não treinados
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {untrainedGroups.map((mg) => (
              <span
                key={mg.muscleGroup}
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: "transparent",
                  border: "1px solid var(--color-border-subtle)",
                  color: "var(--color-text-muted)",
                }}
              >
                {mg.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top priority */}
      {topPriority && topPriority.type !== 'insufficient_data' && (
        <div style={{
          padding: "0.5rem 0.625rem",
          background: "var(--color-bg-subtle)",
          borderRadius: 8,
          borderLeft: `3px solid ${topPriority.priority === 'high' ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
        }}>
          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginBottom: 2, fontWeight: "var(--font-semibold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Próxima prioridade
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" }}>
            {topPriority.title}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
            {topPriority.explanation}
          </div>
        </div>
      )}

      {/* Adjusted sessions note */}
      {week.adjustedSessionsCount > 0 && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
          {week.adjustedSessionsCount} {week.adjustedSessionsCount === 1 ? "sessão com ajuste" : "sessões com ajustes"}
        </div>
      )}
    </section>
  )
}
