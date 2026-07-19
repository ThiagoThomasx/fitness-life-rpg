"use client"

import { useState } from "react"
import { TRAINING_GOAL_TYPE_LABELS, type TrainingGoal } from "@/lib/training-goals"
import type { GoalProgress, GoalConfidence } from "@/lib/training-goal-progress"

const CONFIDENCE_LABELS: Record<GoalConfidence, string> = {
  low: "Confiança baixa",
  medium: "Confiança média",
  high: "Confiança alta",
}

interface GoalCardProps {
  goal: TrainingGoal
  progress: GoalProgress
  onPause?: () => void
  onResume?: () => void
  onComplete?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onReopen?: () => void
  onMarkProgress?: (percentage: number) => void
}

export function GoalCard({
  goal, progress, onPause, onResume, onComplete, onArchive, onRestore, onReopen, onMarkProgress,
}: GoalCardProps) {
  const pct = Math.max(0, Math.min(100, progress.progressPercentage ?? 0))
  const isDone = goal.status === "completed"
  const isArchived = goal.status === "archived"
  const isPaused = goal.status === "paused"
  const isCustomEditable = goal.type === "custom" && (goal.status === "active" || isPaused)
  const [manualDraft, setManualDraft] = useState(pct)

  return (
    <section className="card card--sm" aria-label={goal.title}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>
            {goal.title}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
            {TRAINING_GOAL_TYPE_LABELS[goal.type]}
          </div>
        </div>
        {isDone && (
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-accent)", flexShrink: 0 }}>
            ✓ Concluída
          </span>
        )}
      </div>

      {!isArchived && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "var(--color-border-subtle)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", borderRadius: 9999,
                  background: isDone ? "var(--color-accent)" : "var(--color-accent)",
                  width: `${pct}%`, transition: "width 0.5s ease",
                }}
              />
            </div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)", flexShrink: 0 }}>
              {pct}%
            </span>
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--color-text-primary)", marginTop: 8, fontWeight: 600 }}>
            {progress.headline}
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
            {progress.explanation}
          </p>

          <div style={{ display: "flex", gap: 6, marginTop: 8 }} aria-label="Marcos da meta">
            {progress.milestones.map((m) => (
              <span
                key={m.percentage}
                title={m.reachedAt ? `${m.percentage}% atingido em ${m.reachedAt.slice(0, 10)}` : `${m.percentage}% ainda não atingido`}
                style={{
                  fontSize: "0.6rem", fontWeight: 700, borderRadius: 9999,
                  padding: "2px 8px",
                  color: m.reachedAt ? "var(--color-accent)" : "var(--color-text-muted)",
                  background: m.reachedAt ? "var(--color-accent-subtle)" : "var(--color-bg-subtle)",
                  border: "1px solid",
                  borderColor: m.reachedAt ? "var(--color-accent)" : "var(--color-border-subtle)",
                }}
              >
                {m.reachedAt ? "✓ " : ""}{m.percentage}%
              </span>
            ))}
          </div>

          {progress.projection && progress.projection.method === "linear_recent_trend" && progress.projection.estimatedWeeksMin && (
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 8, fontStyle: "italic" }}>
              {progress.projection.explanation}
              <span style={{ marginLeft: 6, fontStyle: "normal", fontWeight: 600 }}>
                ({CONFIDENCE_LABELS[progress.projection.confidence]})
              </span>
            </div>
          )}

          {isCustomEditable && onMarkProgress && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <label htmlFor={`manual-progress-${goal.id}`} style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                Marcar progresso
              </label>
              <input
                id={`manual-progress-${goal.id}`}
                type="number"
                min={0}
                max={100}
                step={5}
                value={manualDraft}
                onChange={(e) => setManualDraft(Number(e.target.value))}
                style={{
                  width: 56, padding: "3px 6px", borderRadius: 8, fontSize: "0.7rem",
                  border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)",
                  color: "var(--color-text-primary)",
                }}
              />
              <button className="btn btn--ghost" onClick={() => onMarkProgress(manualDraft)} style={actionBtnStyle}>
                Salvar
              </button>
            </div>
          )}
        </>
      )}

      {isArchived && (
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 8 }}>
          Meta arquivada — dados preservados.
        </p>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {goal.status === "active" && onPause && (
          <button className="btn btn--ghost" onClick={onPause} style={actionBtnStyle}>Pausar</button>
        )}
        {isPaused && onResume && (
          <button className="btn btn--ghost" onClick={onResume} style={actionBtnStyle}>Retomar</button>
        )}
        {(goal.status === "active" || isPaused) && onComplete && (
          <button className="btn btn--ghost" onClick={onComplete} style={actionBtnStyle}>Concluir</button>
        )}
        {isDone && onReopen && (
          <button className="btn btn--ghost" onClick={onReopen} style={actionBtnStyle}>Reabrir</button>
        )}
        {!isArchived && onArchive && (
          <button className="btn btn--ghost" onClick={onArchive} style={actionBtnStyle}>Arquivar</button>
        )}
        {isArchived && onRestore && (
          <button className="btn btn--ghost" onClick={onRestore} style={actionBtnStyle}>Restaurar</button>
        )}
      </div>
    </section>
  )
}

const actionBtnStyle: React.CSSProperties = {
  fontSize: "0.7rem", padding: "4px 10px", flex: "0 0 auto",
}
