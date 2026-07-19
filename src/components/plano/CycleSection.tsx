"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getActiveCycle,
  getCompletedCycles,
  getArchivedCycles,
  createCycle,
  completeCycle,
  archiveCycle,
  restoreCycle,
  type TrainingCycle,
  type NewTrainingCycleInput,
} from "@/lib/training-cycles"
import { buildCycleSummary, type TrainingCycleSummary } from "@/lib/training-cycle-summary"
import {
  getReviewsByCycle,
  createCycleReview,
  isMidCycleReviewAvailable,
  type CycleReviewPhase,
  type NewCycleReviewInput,
} from "@/lib/training-cycle-reviews"
import { buildCycleReviewAnalytics } from "@/lib/training-cycle-review-analytics"
import { buildCycleWeekBreakdown } from "@/lib/training-cycle-week-summary"
import { buildCycleWellnessSummary } from "@/lib/training-cycle-wellness"
import { CycleForm } from "./CycleForm"
import { CycleSummaryCard } from "./CycleSummaryCard"
import { CycleReviewForm } from "./CycleReviewForm"
import { CycleReviewPrompt } from "./CycleReviewPrompt"
import { CycleWeeksSection } from "./CycleWeeksSection"
import { CycleComparisonSection } from "./CycleComparisonSection"
import { CycleHistorySection } from "./CycleHistorySection"
import { CycleWellnessSection } from "./CycleWellnessSection"

export function CycleSection() {
  const [activeCycle, setActiveCycle] = useState<TrainingCycle | null>(null)
  const [activeSummary, setActiveSummary] = useState<TrainingCycleSummary | null>(null)
  const [completedCycles, setCompletedCycles] = useState<TrainingCycle[]>([])
  const [archivedCycles, setArchivedCycles] = useState<TrainingCycle[]>([])
  const [showForm, setShowForm] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [closingNotes, setClosingNotes] = useState("")
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [dismissedMidCyclePromptIds, setDismissedMidCyclePromptIds] = useState<Set<string>>(new Set())
  const [reviewFormTarget, setReviewFormTarget] = useState<{ cycleId: string; phase: CycleReviewPhase } | null>(null)
  const [weeksVersion, setWeeksVersion] = useState(0)

  const load = useCallback(() => {
    const active = getActiveCycle()
    setActiveCycle(active)
    setActiveSummary(active ? buildCycleSummary(active) : null)
    setCompletedCycles(getCompletedCycles())
    setArchivedCycles(getArchivedCycles())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCreate(input: NewTrainingCycleInput) {
    const result = createCycle(input)
    if (result.ok) {
      setShowForm(false)
      load()
    }
  }

  function handleConfirmClose() {
    if (!activeCycle) return
    const completed = completeCycle(activeCycle.id, closingNotes || undefined)
    setConfirmingClose(false)
    setClosingNotes("")
    load()
    if (completed) {
      setReviewFormTarget({ cycleId: completed.id, phase: "end_cycle" })
    }
  }

  function handleSubmitReview(input: NewCycleReviewInput) {
    createCycleReview(input)
    setReviewFormTarget(null)
  }

  function handleArchive(cycleId: string) {
    archiveCycle(cycleId)
    setExpandedHistoryId(null)
    load()
  }

  function handleRestore(cycleId: string) {
    restoreCycle(cycleId)
    setExpandedHistoryId(null)
    load()
  }

  const reviewFormTargetCycle =
    reviewFormTarget &&
    ([activeCycle, ...completedCycles, ...archivedCycles].find((c) => c?.id === reviewFormTarget.cycleId) ?? null)

  const reviewFormBanner = reviewFormTarget && (
    <CycleReviewForm
      cycleId={reviewFormTarget.cycleId}
      phase={reviewFormTarget.phase}
      title={reviewFormTarget.phase === "end_cycle" ? "Adicionar revisão final" : "Registrar revisão"}
      wellnessSummary={reviewFormTargetCycle ? buildCycleWellnessSummary(reviewFormTargetCycle) : undefined}
      onSubmit={handleSubmitReview}
      onCancel={() => setReviewFormTarget(null)}
    />
  )

  if (!activeCycle && !showForm) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {reviewFormBanner}

        <section className="card" style={{ textAlign: "center", padding: "2rem 1.25rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📈</div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
            Organize sua evolução em blocos
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
            Crie um ciclo para acompanhar várias semanas de treino como uma única fase — sem perder o controle do dia a dia.
          </p>
          <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ width: "100%" }}>
            Criar ciclo
          </button>
        </section>

        <CycleHistorySection
          completedCycles={completedCycles}
          archivedCycles={archivedCycles}
          expandedId={expandedHistoryId}
          onToggle={(id) => setExpandedHistoryId((prev) => (prev === id ? null : id))}
          onAddReview={(cycleId, phase) => setReviewFormTarget({ cycleId, phase })}
          onArchive={handleArchive}
          onRestore={handleRestore}
          weeksVersion={weeksVersion}
          onAnnotationChange={() => setWeeksVersion((v) => v + 1)}
        />

        {completedCycles.length >= 2 && <CycleComparisonSection completedCycles={completedCycles} />}
      </div>
    )
  }

  if (showForm) {
    return <CycleForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
  }

  const showMidCyclePrompt =
    activeCycle && activeSummary &&
    !dismissedMidCyclePromptIds.has(activeCycle.id) &&
    isMidCycleReviewAvailable(activeCycle.plannedWeeks, activeSummary.completedWeeks, getReviewsByCycle(activeCycle.id))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {reviewFormBanner}

      {showMidCyclePrompt && activeCycle && activeSummary && (
        <CycleReviewPrompt
          completedWeeks={activeSummary.completedWeeks}
          plannedWeeks={activeCycle.plannedWeeks ?? activeSummary.completedWeeks}
          summary={activeSummary}
          onReview={() => setReviewFormTarget({ cycleId: activeCycle.id, phase: "mid_cycle" })}
          onDismiss={() => setDismissedMidCyclePromptIds((prev) => new Set(prev).add(activeCycle.id))}
        />
      )}

      {activeCycle && activeSummary && (
        <CycleSummaryCard
          cycle={activeCycle}
          summary={activeSummary}
          reviewAnalytics={buildCycleReviewAnalytics(getReviewsByCycle(activeCycle.id))}
          onAddReview={() => setReviewFormTarget({ cycleId: activeCycle.id, phase: "manual" })}
        />
      )}

      {activeCycle && (
        <CycleWellnessSection
          summary={buildCycleWellnessSummary(activeCycle)}
          averageReadiness={activeSummary?.averageReadiness}
        />
      )}

      {activeCycle && (
        <CycleWeeksSection
          key={weeksVersion}
          cycleId={activeCycle.id}
          weeks={buildCycleWeekBreakdown(activeCycle)}
          onAnnotationChange={() => setWeeksVersion((v) => v + 1)}
        />
      )}

      {!confirmingClose ? (
        <button className="btn btn--ghost" onClick={() => setConfirmingClose(true)} style={{ width: "100%" }}>
          Concluir ciclo
        </button>
      ) : (
        <section className="card">
          <h3 className="section-label">Concluir ciclo agora?</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            O resumo final é calculado e o ciclo passa a ficar disponível no histórico. Você pode iniciar um novo ciclo em seguida.
          </p>
          <textarea
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            placeholder="Observação final (opcional)"
            maxLength={280}
            rows={2}
            style={{
              width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
              border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)",
              color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontFamily: "inherit",
              resize: "vertical", boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: "0.875rem" }}>
            <button className="btn btn--primary" onClick={handleConfirmClose} style={{ flex: 1 }}>
              Concluir ciclo
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirmingClose(false)} style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      <CycleHistorySection
        completedCycles={completedCycles}
        archivedCycles={archivedCycles}
        expandedId={expandedHistoryId}
        onToggle={(id) => setExpandedHistoryId((prev) => (prev === id ? null : id))}
        onAddReview={(cycleId, phase) => setReviewFormTarget({ cycleId, phase })}
        onArchive={handleArchive}
        onRestore={handleRestore}
        weeksVersion={weeksVersion}
        onAnnotationChange={() => setWeeksVersion((v) => v + 1)}
      />

      {completedCycles.length >= 2 && <CycleComparisonSection completedCycles={completedCycles} />}
    </div>
  )
}
