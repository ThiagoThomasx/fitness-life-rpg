"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useSessionStore } from "@/stores/useSessionStore"
import { MOCK_WORKOUTS, MOCK_EXERCISES, MOCK_WORKOUT_TYPES, type MockWorkout } from "@/lib/mock/data"
import { categoryColor } from "@/lib/theme-colors"
import { EmptyState } from "@/components/ui/EmptyState"
import { getCustomWorkouts, saveCustomWorkout, deleteCustomWorkout, toMockWorkoutShape } from "@/lib/custom-workouts"
import type { WorkoutSession } from "@/types/database"

type AnyWorkout = MockWorkout & { isCustom?: boolean }

// ─── Workout card ─────────────────────────────────────────────────────────────

function WorkoutCard({ workout, onStart, onDelete }: { workout: AnyWorkout; onStart: () => void; onDelete?: () => void }) {
  const colors = categoryColor(workout.workout_type.category)

  return (
    <article className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ height: 3, background: colors.fill }} />
      <div style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
          <span style={{ fontSize: "1.125rem" }} aria-hidden="true">{workout.workout_type.icon ?? "🏋️"}</span>
          <span className="badge-pill" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {workout.workout_type.name}
          </span>
          {workout.isCustom && (
            <span className="badge-pill" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)", marginLeft: "auto" }}>
              Personalizado
            </span>
          )}
        </div>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)", marginBottom: "0.5rem" }}>
          {workout.name}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
          {workout.exercises.map((ex) => (
            <span key={ex.id} style={{
              fontSize: "var(--text-xs)", color: "var(--color-text-secondary)",
              background: "var(--color-bg-highlight)", padding: "2px 0.5rem", borderRadius: 6,
            }}>{ex.name}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            ~{workout.estimated_minutes}min · +{workout.workout_type.base_xp} XP · {workout.exercises.length} exercícios
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {onDelete && (
              <button className="btn btn--ghost" onClick={onDelete}
                style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.75rem" }}
                aria-label={`Excluir treino ${workout.name}`}>
                🗑️
              </button>
            )}
            <button className="btn btn--primary" onClick={onStart} aria-label={`Iniciar treino ${workout.name}`}>
              Iniciar
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Create workout modal ─────────────────────────────────────────────────────

function CreateWorkoutModal({ onSave, onClose }: { onSave: (name: string, typeId: string, exerciseIds: string[], minutes: number) => void; onClose: () => void }) {
  const [name, setName] = useState("")
  const [typeId, setTypeId] = useState("wt-1")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [minutes, setMinutes] = useState(40)
  const [search, setSearch] = useState("")

  const filtered = MOCK_EXERCISES.filter((ex) =>
    !search || ex.name.toLowerCase().includes(search.toLowerCase()) || ex.muscle_groups.some((m) => m.includes(search.toLowerCase()))
  )

  function toggleExercise(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || selectedIds.length === 0) return
    onSave(name.trim(), typeId, selectedIds, minutes)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "flex-end", padding: 0 }} onClick={onClose}>
      <div style={{ background: "#121212", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "90dvh", overflowY: "auto", padding: "1.5rem 1rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>Criar Treino Personalizado</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#b3b3b3", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.375rem" }}>Nome do treino *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Treino Full Body" required
              style={{ width: "100%", background: "#282828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.625rem 0.75rem", color: "#fff", fontSize: "0.875rem", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.375rem" }}>Tipo</label>
              <select value={typeId} onChange={(e) => setTypeId(e.target.value)}
                style={{ width: "100%", background: "#282828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.625rem 0.75rem", color: "#fff", fontSize: "0.875rem" }}>
                {MOCK_WORKOUT_TYPES.map((wt) => (
                  <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.375rem" }}>Duração (min)</label>
              <input type="number" min={5} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
                style={{ width: "100%", background: "#282828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.625rem 0.75rem", color: "#fff", fontSize: "0.875rem", textAlign: "center" }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.375rem" }}>
              Exercícios * ({selectedIds.length} selecionado{selectedIds.length !== 1 ? "s" : ""})
            </label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar exercício..."
              style={{ width: "100%", background: "#282828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.5rem 0.75rem", color: "#fff", fontSize: "0.875rem", boxSizing: "border-box", marginBottom: "0.5rem" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxHeight: "30dvh", overflowY: "auto" }}>
              {filtered.map((ex) => {
                const selected = selectedIds.includes(ex.id)
                return (
                  <button key={ex.id} type="button" onClick={() => toggleExercise(ex.id)}
                    style={{
                      background: selected ? "rgba(29,185,84,0.12)" : "#1e1e1e",
                      border: `1px solid ${selected ? "rgba(29,185,84,0.35)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 10, padding: "0.625rem 0.875rem",
                      display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", textAlign: "left",
                    }}>
                    <span style={{ fontSize: "1.1rem" }}>{selected ? "✅" : "⬜"}</span>
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: selected ? "#1db954" : "#ffffff" }}>{ex.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#6a6a6a" }}>{ex.muscle_groups.join(", ")}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <button type="submit" disabled={!name.trim() || selectedIds.length === 0}
            style={{
              background: name.trim() && selectedIds.length > 0 ? "#1db954" : "#282828",
              color: name.trim() && selectedIds.length > 0 ? "#000" : "#6a6a6a",
              border: "none", borderRadius: 12, padding: "0.875rem", fontSize: "0.9rem",
              fontWeight: 800, cursor: "pointer", width: "100%",
            }}>
            Criar Treino
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Recommendation filter ────────────────────────────────────────────────────

type TimeFilter = 'all' | 'quick' | 'medium' | 'long'

function filterByTime(workouts: AnyWorkout[], filter: TimeFilter): AnyWorkout[] {
  if (filter === 'all') return workouts
  if (filter === 'quick') return workouts.filter((w) => w.estimated_minutes <= 25)
  if (filter === 'medium') return workouts.filter((w) => w.estimated_minutes > 25 && w.estimated_minutes <= 45)
  return workouts.filter((w) => w.estimated_minutes > 45)
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TreinosPage() {
  const router = useRouter()
  const { startSession, addExercise, activeSession } = useSessionStore()
  const [customWorkouts, setCustomWorkouts] = useState<AnyWorkout[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  useEffect(() => {
    const cws = getCustomWorkouts()
    setCustomWorkouts(cws.map((cw) => toMockWorkoutShape(cw, MOCK_EXERCISES) as AnyWorkout))
  }, [])

  function handleStart(workout: AnyWorkout) {
    const session: WorkoutSession = {
      id: `session-${Date.now()}`,
      workout_id: workout.id,
      user_id: "mock-user-id",
      started_at: new Date().toISOString(),
      completed_at: null,
      xp_earned: 0,
      intensity_multiplier: 1,
      notes: null,
    }
    startSession(session)
    for (const ex of workout.exercises) addExercise(ex)
    router.push("/sessao")
  }

  function handleCreateWorkout(name: string, typeId: string, exerciseIds: string[], minutes: number) {
    const saved = saveCustomWorkout({ name, workoutTypeId: typeId, exerciseIds, estimatedMinutes: minutes })
    const asWorkout = toMockWorkoutShape(saved, MOCK_EXERCISES) as AnyWorkout
    setCustomWorkouts((prev) => [asWorkout, ...prev])
    setShowCreate(false)
  }

  function handleDeleteCustom(id: string) {
    if (!window.confirm("Excluir este treino personalizado?")) return
    deleteCustomWorkout(id)
    setCustomWorkouts((prev) => prev.filter((w) => w.id !== id))
  }

  const allWorkouts: AnyWorkout[] = [...customWorkouts, ...MOCK_WORKOUTS]
  const visible = filterByTime(allWorkouts, timeFilter)

  const timeFilters: { key: TimeFilter; label: string; desc: string }[] = [
    { key: 'all', label: 'Todos', desc: '' },
    { key: 'quick', label: '≤ 25min', desc: 'Rápido' },
    { key: 'medium', label: '25–45min', desc: 'Médio' },
    { key: 'long', label: '> 45min', desc: 'Longo' },
  ]

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
          Meus Treinos
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {activeSession && (
            <button className="btn btn--ghost" onClick={() => router.push("/sessao")}
              style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.875rem", borderRadius: 9999 }}>
              ▶ Sessão Ativa
            </button>
          )}
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}
            style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.875rem" }}>
            + Criar
          </button>
        </div>
      </div>

      {/* Time filter */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {timeFilters.map((f) => (
          <button key={f.key} onClick={() => setTimeFilter(f.key)}
            style={{
              padding: "0.375rem 0.875rem", borderRadius: 9999, fontSize: "var(--text-xs)",
              fontWeight: 600, cursor: "pointer", border: "1px solid",
              background: timeFilter === f.key ? "rgba(29,185,84,0.15)" : "rgba(255,255,255,0.04)",
              borderColor: timeFilter === f.key ? "rgba(29,185,84,0.4)" : "rgba(255,255,255,0.08)",
              color: timeFilter === f.key ? "#1db954" : "#b3b3b3",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Workout list */}
      {visible.length === 0 ? (
        <EmptyState icon="🏋️" title="Nenhum treino neste filtro" description="Ajuste o filtro de duração ou crie um treino personalizado." />
      ) : (
        visible.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onStart={() => handleStart(workout)}
            onDelete={workout.isCustom ? () => handleDeleteCustom(workout.id) : undefined}
          />
        ))
      )}

      {showCreate && (
        <CreateWorkoutModal onSave={handleCreateWorkout} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
