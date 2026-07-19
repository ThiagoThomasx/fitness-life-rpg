"use client"

import { useState } from "react"
import type { TrainingCycle } from "@/lib/training-cycles"
import { buildCycleSummary } from "@/lib/training-cycle-summary"
import { getReviewsByCycle, type CycleReviewPhase } from "@/lib/training-cycle-reviews"
import { buildCycleReviewAnalytics } from "@/lib/training-cycle-review-analytics"
import { buildCycleWeekBreakdown } from "@/lib/training-cycle-week-summary"
import { buildCycleWellnessSummary } from "@/lib/training-cycle-wellness"
import { CycleSummaryCard } from "./CycleSummaryCard"
import { CycleWeeksSection } from "./CycleWeeksSection"
import { CycleWellnessSection } from "./CycleWellnessSection"

interface CycleHistorySectionProps {
  completedCycles: TrainingCycle[]
  archivedCycles: TrainingCycle[]
  expandedId: string | null
  onToggle: (id: string) => void
  onAddReview: (cycleId: string, phase: CycleReviewPhase) => void
  onArchive: (cycleId: string) => void
  onRestore: (cycleId: string) => void
  weeksVersion: number
  onAnnotationChange: () => void
}

export function CycleHistorySection({
  completedCycles, archivedCycles, expandedId, onToggle, onAddReview, onArchive, onRestore, weeksVersion, onAnnotationChange,
}: CycleHistorySectionProps) {
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null)

  if (completedCycles.length === 0 && archivedCycles.length === 0) return null

  return (
    <>
      {completedCycles.length > 0 && (
        <section>
          <h3 className="section-label">Ciclos concluídos</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {completedCycles.map((cycle) => {
              const isExpanded = expandedId === cycle.id
              if (!isExpanded) {
                return (
                  <CycleRow key={cycle.id} cycle={cycle} onToggle={() => onToggle(cycle.id)} />
                )
              }

              const summary = buildCycleSummary(cycle)
              const reviewAnalytics = buildCycleReviewAnalytics(getReviewsByCycle(cycle.id))
              return (
                <div key={cycle.id}>
                  <CycleSummaryCard
                    cycle={cycle}
                    summary={summary}
                    reviewAnalytics={reviewAnalytics}
                    onAddReview={() => onAddReview(cycle.id, reviewAnalytics.endCycleReview ? "manual" : "end_cycle")}
                  />
                  <div style={{ marginTop: "0.75rem" }}>
                    <CycleWellnessSection summary={buildCycleWellnessSummary(cycle)} averageReadiness={summary.averageReadiness} />
                  </div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <CycleWeeksSection
                      key={weeksVersion}
                      cycleId={cycle.id}
                      weeks={buildCycleWeekBreakdown(cycle)}
                      onAnnotationChange={onAnnotationChange}
                    />
                  </div>

                  {confirmingArchiveId === cycle.id ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        className="btn btn--primary"
                        onClick={() => { onArchive(cycle.id); setConfirmingArchiveId(null) }}
                        style={{ flex: 1 }}
                      >
                        Confirmar arquivamento
                      </button>
                      <button className="btn btn--ghost" onClick={() => setConfirmingArchiveId(null)} style={{ flex: 1 }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button className="btn btn--ghost" onClick={() => onToggle(cycle.id)} style={{ flex: 1 }}>
                        Recolher
                      </button>
                      <button className="btn btn--ghost" onClick={() => setConfirmingArchiveId(cycle.id)} style={{ flex: 1 }}>
                        Arquivar ciclo
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {archivedCycles.length > 0 && (
        <section>
          <h3 className="section-label">Ciclos arquivados</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {archivedCycles.map((cycle) => {
              const isExpanded = expandedId === cycle.id
              if (!isExpanded) {
                return <CycleRow key={cycle.id} cycle={cycle} onToggle={() => onToggle(cycle.id)} muted />
              }

              const summary = buildCycleSummary(cycle)
              const reviewAnalytics = buildCycleReviewAnalytics(getReviewsByCycle(cycle.id))
              return (
                <div key={cycle.id}>
                  <CycleSummaryCard cycle={cycle} summary={summary} reviewAnalytics={reviewAnalytics} />
                  <div style={{ marginTop: "0.75rem" }}>
                    <CycleWellnessSection summary={buildCycleWellnessSummary(cycle)} averageReadiness={summary.averageReadiness} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn btn--ghost" onClick={() => onToggle(cycle.id)} style={{ flex: 1 }}>
                      Recolher
                    </button>
                    <button className="btn btn--primary" onClick={() => onRestore(cycle.id)} style={{ flex: 1 }}>
                      Restaurar ciclo
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

function CycleRow({ cycle, onToggle, muted }: { cycle: TrainingCycle; onToggle: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onToggle}
      className="card card--sm"
      style={{
        textAlign: "left", cursor: "pointer", width: "100%",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
        opacity: muted ? 0.75 : 1,
      }}
    >
      <div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>
          {cycle.name}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
          {cycle.startDate} — {cycle.completedAt?.slice(0, 10)}
        </div>
      </div>
      <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>→</span>
    </button>
  )
}
