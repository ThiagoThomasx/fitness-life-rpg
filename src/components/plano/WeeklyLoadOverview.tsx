"use client"

import { useState } from "react"
import type { TrainingWeek } from "@/lib/training-load"
import { getCustomWorkouts } from "@/lib/custom-workouts"
import { skipSession, restoreSession, isSessionSkipped } from "@/lib/session-plan-changes"
import { getWeekStart } from "@/lib/weekly-plan"

interface WeeklyLoadOverviewProps {
  week: TrainingWeek
  onRefresh: () => void
}

export function WeeklyLoadOverview({ week, onRefresh }: WeeklyLoadOverviewProps) {
  const customWorkouts = getCustomWorkouts()
  const weekStart = getWeekStart()

  const [skippedMap, setSkippedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const cw of customWorkouts) {
      map[cw.id] = isSessionSkipped(cw.id, weekStart)
    }
    return map
  })

  function handleSkip(id: string, name: string) {
    skipSession(id, name, weekStart)
    setSkippedMap((prev) => ({ ...prev, [id]: true }))
    onRefresh()
  }

  function handleRestore(id: string) {
    restoreSession(id, weekStart)
    setSkippedMap((prev) => ({ ...prev, [id]: false }))
    onRefresh()
  }

  // Sessions completed this week by workoutId
  const completedIds = new Set(week.completedSessions.map((s) => s.workoutId))

  if (customWorkouts.length === 0 && week.completedSessions.length === 0) {
    return null
  }

  return (
    <section className="card card--sm">
      <h3 className="section-label">Distribuição de treinos</h3>

      {/* Weekly progress bar */}
      {week.totalPlannedSessions > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
              Sessões concluídas
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
              {week.totalCompletedSessions}/{week.totalPlannedSessions}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 9999, background: "var(--color-bg-subtle)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 9999,
              background: week.completionRate >= 1 ? "var(--color-accent)" : "var(--color-accent)",
              width: `${Math.min(week.completionRate * 100, 100)}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      )}

      {/* Custom workout list with status */}
      {customWorkouts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {customWorkouts.map((cw) => {
            const isCompleted = completedIds.has(cw.id)
            const isSkipped = skippedMap[cw.id] ?? false
            return (
              <div
                key={cw.id}
                style={{
                  padding: "0.5rem 0.625rem",
                  borderRadius: 8,
                  background: isSkipped ? "transparent" : "var(--color-bg-subtle)",
                  border: `1px solid ${isCompleted
                    ? "rgba(200,241,105,0.3)"
                    : isSkipped
                      ? "var(--color-border-subtle)"
                      : "var(--color-border-subtle)"}`,
                  opacity: isSkipped ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)",
                      color: isCompleted ? "var(--color-accent)" : "var(--color-text-primary)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {isCompleted && <span aria-label="Concluído">✓</span>}
                      {isSkipped && <span aria-label="Pulado">○</span>}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cw.name}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {isCompleted
                        ? `Concluído`
                        : isSkipped
                          ? "Pulado esta semana"
                          : "Disponível"}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isCompleted && (
                    <div style={{ flexShrink: 0 }}>
                      {isSkipped ? (
                        <button
                          onClick={() => handleRestore(cw.id)}
                          style={{
                            fontSize: "0.65rem", padding: "2px 8px",
                            borderRadius: 6, cursor: "pointer",
                            background: "transparent",
                            border: "1px solid var(--color-border-subtle)",
                            color: "var(--color-text-muted)",
                          }}
                          aria-label={`Restaurar ${cw.name}`}
                        >
                          Restaurar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSkip(cw.id, cw.name)}
                          style={{
                            fontSize: "0.65rem", padding: "2px 8px",
                            borderRadius: 6, cursor: "pointer",
                            background: "transparent",
                            border: "1px solid var(--color-border-subtle)",
                            color: "var(--color-text-muted)",
                          }}
                          aria-label={`Pular ${cw.name} esta semana`}
                        >
                          Pular
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Free sessions */}
      {week.totalFreeSessions > 0 && (
        <div style={{
          padding: "0.5rem 0.625rem",
          borderRadius: 8,
          background: "var(--color-bg-subtle)",
          border: "1px solid var(--color-border-subtle)",
          fontSize: "0.7rem",
          color: "var(--color-text-muted)",
        }}>
          + {week.totalFreeSessions} sessão{week.totalFreeSessions !== 1 ? "ões" : ""} adicional{week.totalFreeSessions !== 1 ? "is" : ""} fora do plano
        </div>
      )}
    </section>
  )
}
