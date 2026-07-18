import type { TrainingCycle } from "@/lib/training-cycles"
import { TRAINING_CYCLE_GOAL_LABELS } from "@/lib/training-cycles"
import type { TrainingCycleSummary, CycleTrend } from "@/lib/training-cycle-summary"
import type { CycleReviewAnalytics } from "@/lib/training-cycle-review-analytics"

const TREND_LABELS: Record<CycleTrend, string> = {
  increasing: "Volume crescendo",
  stable: "Volume estável",
  decreasing: "Volume reduzindo",
  mixed: "Volume oscilando",
  insufficient_data: "Dados insuficientes ainda",
}

const EXERCISE_STATUS_LABELS: Record<string, string> = {
  improving: "Evoluindo",
  stable: "Estável",
  stagnant: "Estagnado",
  regressing: "Em queda",
  insufficient_data: "Poucos dados",
}

const EXERCISE_STATUS_COLORS: Record<string, string> = {
  improving: "var(--color-success)",
  stable: "var(--color-text-secondary)",
  stagnant: "var(--color-warning)",
  regressing: "var(--color-danger)",
  insufficient_data: "var(--color-text-muted)",
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
    </div>
  )
}

interface CycleSummaryCardProps {
  cycle: TrainingCycle
  summary: TrainingCycleSummary
  reviewAnalytics?: CycleReviewAnalytics
  onAddReview?: () => void
}

export function CycleSummaryCard({ cycle, summary, reviewAnalytics, onAddReview }: CycleSummaryCardProps) {
  const goalLabel = cycle.goal === "custom" ? cycle.customGoal || "Personalizado" : TRAINING_CYCLE_GOAL_LABELS[cycle.goal]
  const weekLabel = summary.plannedWeeks
    ? `Semana ${Math.min(summary.completedWeeks, summary.plannedWeeks)} de ${summary.plannedWeeks}`
    : `Semana ${summary.completedWeeks}`

  const improving = summary.exercises.filter((e) => e.status === "improving")
  const stagnantOrRegressing = summary.exercises.filter((e) => e.status === "stagnant" || e.status === "regressing")

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: "0.25rem" }}>
        <div>
          <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
            {cycle.name}
          </h3>
          <span style={{
            display: "inline-block", marginTop: 6, fontSize: "0.7rem", fontWeight: 500,
            color: "var(--color-text-muted)", background: "var(--color-bg-subtle)",
            border: "1px solid var(--color-border-subtle)", borderRadius: 6, padding: "2px 8px",
          }}>
            {goalLabel}
          </span>
        </div>
        {cycle.status === "completed" && (
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-success)" }}>✓ Concluído</span>
        )}
      </div>

      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 4 }}>{weekLabel}</div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem",
        marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border-subtle)",
      }}>
        <Stat label="Sessões" value={String(summary.totalSessions)} />
        <Stat label="PRs" value={String(summary.totalPrs)} />
        <Stat label="Volume total" value={`${Math.round(summary.totalVolumeKg).toLocaleString("pt-BR")} kg`} />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginTop: "0.75rem",
      }}>
        <Stat label="Vol. médio/sem" value={`${summary.averageWeeklyVolumeKg.toLocaleString("pt-BR")} kg`} />
        <Stat label="Fora do plano" value={String(summary.freeSessions)} />
        <Stat
          label="Prontidão média"
          value={summary.averageReadiness !== null ? summary.averageReadiness.toFixed(1) : "—"}
        />
      </div>

      <div style={{
        marginTop: "0.875rem", padding: "0.5rem 0.75rem", borderRadius: 8,
        background: "var(--color-bg-subtle)", fontSize: "0.75rem", color: "var(--color-text-secondary)",
      }}>
        {TREND_LABELS[summary.trend]}
      </div>

      {summary.muscleGroups.length > 0 && (
        <div style={{ marginTop: "0.875rem" }}>
          <h4 className="section-label" style={{ marginBottom: 6 }}>Grupos musculares</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {summary.muscleGroups.map((mg) => (
              <div key={mg.muscleGroup} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>{mg.label}</span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {mg.totalSessions} sessões · {Math.round(mg.totalVolumeKg).toLocaleString("pt-BR")} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(improving.length > 0 || stagnantOrRegressing.length > 0) && (
        <div style={{ marginTop: "0.875rem" }}>
          <h4 className="section-label" style={{ marginBottom: 6 }}>Exercícios</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[...improving, ...stagnantOrRegressing].slice(0, 6).map((ex) => (
              <div key={ex.exerciseId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>{ex.exerciseName}</span>
                <span style={{ color: EXERCISE_STATUS_COLORS[ex.status], fontWeight: 600 }}>
                  {EXERCISE_STATUS_LABELS[ex.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cycle.notes && (
        <div style={{
          marginTop: "0.875rem", padding: "0.5rem 0.75rem", borderRadius: 8,
          background: "var(--color-bg-subtle)", fontSize: "0.7rem", color: "var(--color-text-muted)",
          fontStyle: "italic",
        }}>
          &ldquo;{cycle.notes}&rdquo;
        </div>
      )}

      {reviewAnalytics && reviewAnalytics.totalReviews > 0 && (
        <div style={{ marginTop: "0.875rem", paddingTop: "0.875rem", borderTop: "1px solid var(--color-border-subtle)" }}>
          <h4 className="section-label" style={{ marginBottom: 6 }}>Revisões ({reviewAnalytics.totalReviews})</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <Stat label="Progresso" value={reviewAnalytics.averagePerceivedProgress?.toFixed(1) ?? "—"} />
            <Stat label="Recuperação" value={reviewAnalytics.averagePerceivedRecovery?.toFixed(1) ?? "—"} />
            <Stat label="Satisfação" value={reviewAnalytics.averageSatisfaction?.toFixed(1) ?? "—"} />
          </div>
          {reviewAnalytics.lastReview?.notes && (
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontStyle: "italic", marginTop: "0.625rem" }}>
              &ldquo;{reviewAnalytics.lastReview.notes}&rdquo;
            </div>
          )}
        </div>
      )}

      {onAddReview && (
        <button className="btn btn--ghost" onClick={onAddReview} style={{ width: "100%", marginTop: "0.875rem" }}>
          {cycle.status === "completed" && !reviewAnalytics?.endCycleReview ? "Adicionar revisão final" : "Registrar revisão"}
        </button>
      )}
    </section>
  )
}
