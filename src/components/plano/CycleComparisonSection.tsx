"use client"

import { useMemo, useState } from "react"
import type { TrainingCycle } from "@/lib/training-cycles"
import { buildCycleSummary } from "@/lib/training-cycle-summary"
import { compareCycles, type MetricComparison } from "@/lib/training-cycle-comparison"

interface CycleComparisonSectionProps {
  completedCycles: TrainingCycle[]
}

function MetricRow({ label, unit, comparison }: { label: string; unit: string; comparison: MetricComparison }) {
  const format = (v: number | undefined) => (v === undefined ? "—" : `${v.toLocaleString("pt-BR")}${unit}`)
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", padding: "0.375rem 0" }}>
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ color: "var(--color-text-muted)", display: "flex", gap: 8 }}>
        <span>{format(comparison.first)}</span>
        <span>→</span>
        <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{format(comparison.second)}</span>
      </span>
    </div>
  )
}

export function CycleComparisonSection({ completedCycles }: CycleComparisonSectionProps) {
  const [firstId, setFirstId] = useState("")
  const [secondId, setSecondId] = useState("")

  const comparison = useMemo(() => {
    if (!firstId || !secondId || firstId === secondId) return null
    const firstCycle = completedCycles.find((c) => c.id === firstId)
    const secondCycle = completedCycles.find((c) => c.id === secondId)
    if (!firstCycle || !secondCycle) return null
    return compareCycles(
      { cycle: firstCycle, summary: buildCycleSummary(firstCycle) },
      { cycle: secondCycle, summary: buildCycleSummary(secondCycle) }
    )
  }, [firstId, secondId, completedCycles])

  if (completedCycles.length < 2) {
    return (
      <section className="card">
        <h3 className="section-label">Comparar ciclos</h3>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: 6 }}>
          Você precisa de pelo menos dois ciclos concluídos para comparar.
        </p>
      </section>
    )
  }

  return (
    <section className="card">
      <h3 className="section-label">Comparar ciclos</h3>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <div style={{ flex: 1 }}>
          <label style={selectLabelStyle}>Primeiro ciclo</label>
          <select value={firstId} onChange={(e) => setFirstId(e.target.value)} style={selectStyle}>
            <option value="">Selecione</option>
            {completedCycles.map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === secondId}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={selectLabelStyle}>Segundo ciclo</label>
          <select value={secondId} onChange={(e) => setSecondId(e.target.value)} style={selectStyle}>
            <option value="">Selecione</option>
            {completedCycles.map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === firstId}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {comparison && (
        <div style={{ marginTop: "1rem" }}>
          {comparison.summaryMessages.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "0.875rem" }}>
              {comparison.summaryMessages.map((msg, i) => (
                <div key={i} style={{
                  padding: "0.5rem 0.75rem", borderRadius: 8, background: "var(--color-bg-subtle)",
                  fontSize: "0.75rem", color: "var(--color-text-secondary)",
                }}>
                  {msg}
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "0.625rem" }}>
            <MetricRow label="Duração (semanas)" unit="" comparison={comparison.duration} />
            <MetricRow label="Sessões" unit="" comparison={comparison.sessions} />
            <MetricRow label="Frequência semanal" unit="/sem" comparison={comparison.weeklyFrequency} />
            <MetricRow label="Volume total" unit=" kg" comparison={comparison.totalVolumeKg} />
            <MetricRow label="Volume médio/semana" unit=" kg" comparison={comparison.averageWeeklyVolumeKg} />
            <MetricRow label="Volume médio/sessão" unit=" kg" comparison={comparison.averageVolumePerSessionKg} />
            <MetricRow label="Aderência ao plano" unit="%" comparison={comparison.adherence} />
            <MetricRow label="PRs" unit="" comparison={comparison.prs} />
            <MetricRow label="Prontidão média" unit="" comparison={comparison.averageReadiness} />
            <MetricRow label="Sessões ajustadas" unit="" comparison={comparison.adjustedSessions} />
          </div>

          {comparison.sharedExercises.length > 0 && (
            <div style={{ marginTop: "0.875rem" }}>
              <h4 className="section-label" style={{ marginBottom: 6 }}>Exercícios em comum</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {comparison.sharedExercises.map((ex) => (
                  <div key={ex.exerciseId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>{ex.exerciseName}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {ex.first?.lastWeightKg ?? "—"} kg → {ex.second?.lastWeightKg ?? "—"} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(comparison.exclusiveToFirstExercises.length > 0 || comparison.exclusiveToSecondExercises.length > 0) && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
              {comparison.exclusiveToFirstExercises.length > 0 && (
                <div>Só no primeiro ciclo: {comparison.exclusiveToFirstExercises.join(", ")}</div>
              )}
              {comparison.exclusiveToSecondExercises.length > 0 && (
                <div>Só no segundo ciclo: {comparison.exclusiveToSecondExercises.join(", ")}</div>
              )}
            </div>
          )}

          {comparison.muscleGroups.length > 0 && (
            <div style={{ marginTop: "0.875rem" }}>
              <h4 className="section-label" style={{ marginBottom: 6 }}>Grupos musculares</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {comparison.muscleGroups.map((mg) => (
                  <div key={mg.muscleGroup} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {mg.label}{!mg.sharedInBoth && " (só um ciclo)"}
                    </span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {mg.averageWeeklyVolumeKg.first ?? "—"} → {mg.averageWeeklyVolumeKg.second ?? "—"} kg/sem
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

const selectLabelStyle: React.CSSProperties = {
  fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 500, display: "block", marginBottom: 4,
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.625rem", borderRadius: 8,
  border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)",
  color: "var(--color-text-primary)", fontSize: "0.8rem", boxSizing: "border-box",
}
