"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getActiveGoals,
  getPausedGoals,
  getCompletedGoals,
  getArchivedGoals,
  createGoal,
  pauseGoal,
  resumeGoal,
  completeGoal,
  reopenGoal,
  archiveGoal,
  restoreGoal,
  updateGoalManualProgress,
  type TrainingGoal,
  type NewTrainingGoalInput,
} from "@/lib/training-goals"
import { calculateGoalProgress } from "@/lib/training-goal-progress"
import { GoalForm } from "./GoalForm"
import { GoalCard } from "./GoalCard"

export function GoalsSection() {
  const [activeGoals, setActiveGoals] = useState<TrainingGoal[]>([])
  const [pausedGoals, setPausedGoals] = useState<TrainingGoal[]>([])
  const [completedGoals, setCompletedGoals] = useState<TrainingGoal[]>([])
  const [archivedGoals, setArchivedGoals] = useState<TrainingGoal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(() => {
    setActiveGoals(getActiveGoals())
    setPausedGoals(getPausedGoals())
    setCompletedGoals(getCompletedGoals())
    setArchivedGoals(getArchivedGoals())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCreate(input: NewTrainingGoalInput) {
    const result = createGoal(input)
    if (result.ok) {
      setShowForm(false)
      load()
    }
  }

  const hasAnyGoal =
    activeGoals.length + pausedGoals.length + completedGoals.length + archivedGoals.length > 0

  if (!hasAnyGoal && !showForm) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <section className="card" style={{ textAlign: "center", padding: "2rem 1.25rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎯</div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
            Transforme sua evolução em objetivos
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
            Crie uma meta pessoal de carga, repetições, 1RM ou frequência e acompanhe o progresso real —
            sem promessas de prazo, sem XP envolvido.
          </p>
          <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ width: "100%" }}>
            Criar meta
          </button>
        </section>
      </div>
    )
  }

  if (showForm) {
    return <GoalForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {activeGoals.length > 0 && (
        <section>
          <h3 className="section-label">Metas ativas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={calculateGoalProgress(goal)}
                onPause={() => { pauseGoal(goal.id); load() }}
                onComplete={() => { completeGoal(goal.id); load() }}
                onArchive={() => { archiveGoal(goal.id); load() }}
                onMarkProgress={(pct) => { updateGoalManualProgress(goal.id, pct); load() }}
              />
            ))}
          </div>
        </section>
      )}

      <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ width: "100%" }}>
        + Nova meta
      </button>

      {pausedGoals.length > 0 && (
        <section>
          <h3 className="section-label">Pausadas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pausedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={calculateGoalProgress(goal)}
                onResume={() => { resumeGoal(goal.id); load() }}
                onComplete={() => { completeGoal(goal.id); load() }}
                onArchive={() => { archiveGoal(goal.id); load() }}
                onMarkProgress={(pct) => { updateGoalManualProgress(goal.id, pct); load() }}
              />
            ))}
          </div>
        </section>
      )}

      {completedGoals.length > 0 && (
        <section>
          <h3 className="section-label">Concluídas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={calculateGoalProgress(goal)}
                onReopen={() => { reopenGoal(goal.id); load() }}
                onArchive={() => { archiveGoal(goal.id); load() }}
              />
            ))}
          </div>
        </section>
      )}

      {archivedGoals.length > 0 && (
        <section>
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
              background: "transparent", border: "none", cursor: "pointer", padding: "4px 0",
            }}
          >
            <h3 className="section-label" style={{ marginBottom: 0 }}>
              Arquivadas ({archivedGoals.length})
            </h3>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
              {showArchived ? "Ocultar ▲" : "Mostrar ▼"}
            </span>
          </button>
          {showArchived && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
              {archivedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={calculateGoalProgress(goal)}
                  onRestore={() => { restoreGoal(goal.id); load() }}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
