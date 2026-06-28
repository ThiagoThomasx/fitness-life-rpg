"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { useSessionStore } from "@/stores/useSessionStore"
import { MOCK_WORKOUTS, MOCK_WORKOUT_TYPES, type MockWorkout } from "@/lib/mock/data"
import { categoryColor } from "@/lib/theme-colors"
import { EmptyState } from "@/components/ui/EmptyState"
import {
  getCustomWorkouts,
  saveCustomWorkout,
  updateCustomWorkout,
  duplicateCustomWorkout,
  deleteCustomWorkout,
  toMockWorkoutShape,
  saveCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  getCustomExercises,
  getAllExercises,
  type CustomWorkout,
  type ExerciseTarget,
  type CustomExercise,
} from "@/lib/custom-workouts"
import { getExercisePersonalBest, getExerciseHistory } from "@/lib/workout-history"
import { suggestProgression } from "@/lib/progression"
import type { WorkoutSession, Exercise } from "@/types/database"
import { getPreferences } from "@/lib/preferences"
import { getWorkoutRecommendations } from "@/lib/recommendations"

type AnyWorkout = MockWorkout & { isCustom?: boolean; targets?: ExerciseTarget[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "#282828",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "0.625rem 0.75rem",
  color: "#fff",
  fontSize: "0.875rem",
  boxSizing: "border-box",
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#b3b3b3",
  display: "block",
  marginBottom: "0.375rem",
}

// ─── Workout card ─────────────────────────────────────────────────────────────

function WorkoutCard({
  workout,
  onStart,
  onDelete,
  onEdit,
  onDuplicate,
  isRecommended,
}: {
  workout: AnyWorkout
  onStart: () => void
  onDelete?: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  isRecommended?: boolean
}) {
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
            <span className="badge-pill" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" }}>
              Personalizado
            </span>
          )}
          {isRecommended && !workout.isCustom && (
            <span className="badge-pill" style={{ background: "rgba(29,185,84,0.12)", color: "#1db954", border: "1px solid rgba(29,185,84,0.3)", marginLeft: "auto" }}>
              ✨ Para você
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
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {onDuplicate && (
              <button className="btn btn--ghost" onClick={onDuplicate}
                style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.625rem" }}
                title="Duplicar treino">⧉</button>
            )}
            {onEdit && (
              <button className="btn btn--ghost" onClick={onEdit}
                style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.625rem" }}
                title="Editar treino">✏️</button>
            )}
            {onDelete && (
              <button className="btn btn--ghost" onClick={onDelete}
                style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.625rem" }}
                aria-label={`Excluir treino ${workout.name}`}>🗑️</button>
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

// ─── Target inputs per exercise ───────────────────────────────────────────────

function ExerciseTargetRow({
  exercise,
  target,
  onChange,
  onRemove,
}: {
  exercise: Exercise
  target: ExerciseTarget
  onChange: (t: ExerciseTarget) => void
  onRemove: () => void
}) {
  const numInput: React.CSSProperties = {
    background: "#1e1e1e",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "0.375rem 0.5rem",
    color: "#fff",
    fontSize: "0.8rem",
    width: 56,
    textAlign: "center",
  }

  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid rgba(29,185,84,0.25)",
      borderRadius: 10,
      padding: "0.625rem 0.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1db954" }}>{exercise.name}</span>
        <button type="button" onClick={onRemove}
          style={{ background: "none", border: "none", color: "#6a6a6a", cursor: "pointer", fontSize: "1rem", padding: "0 0.25rem" }}>✕</button>
      </div>
      <div style={{ fontSize: "0.7rem", color: "#6a6a6a" }}>{exercise.muscle_groups.join(", ")}</div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          <label style={{ fontSize: "0.65rem", color: "#6a6a6a" }}>Séries</label>
          <input type="number" min={1} max={20} value={target.targetSets}
            onChange={(e) => onChange({ ...target, targetSets: Number(e.target.value) })}
            style={numInput} inputMode="numeric" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          <label style={{ fontSize: "0.65rem", color: "#6a6a6a" }}>Reps</label>
          <input type="number" min={1} max={100} value={target.targetReps ?? ""}
            placeholder="—"
            onChange={(e) => onChange({ ...target, targetReps: e.target.value ? Number(e.target.value) : null })}
            style={numInput} inputMode="numeric" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          <label style={{ fontSize: "0.65rem", color: "#6a6a6a" }}>Peso (kg)</label>
          <input type="number" min={0} step={0.5} value={target.targetWeightKg ?? ""}
            placeholder="—"
            onChange={(e) => onChange({ ...target, targetWeightKg: e.target.value ? Number(e.target.value) : null })}
            style={{ ...numInput, width: 68 }} inputMode="decimal" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          <label style={{ fontSize: "0.65rem", color: "#6a6a6a" }}>Duração (s)</label>
          <input type="number" min={0} step={5} value={target.targetDurationSecs ?? ""}
            placeholder="—"
            onChange={(e) => onChange({ ...target, targetDurationSecs: e.target.value ? Number(e.target.value) : null })}
            style={{ ...numInput, width: 68 }} inputMode="numeric" />
        </div>
      </div>
    </div>
  )
}

// ─── Workout builder modal ────────────────────────────────────────────────────

function WorkoutBuilderModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CustomWorkout
  onSave: (data: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
}) {
  const allExercises = getAllExercises()
  const [name, setName] = useState(initial?.name ?? "")
  const [typeId, setTypeId] = useState(initial?.workoutTypeId ?? "wt-1")
  const [minutes, setMinutes] = useState(initial?.estimatedMinutes ?? 40)
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.exerciseIds ?? [])
  const [targets, setTargets] = useState<ExerciseTarget[]>(initial?.targets ?? [])
  const [search, setSearch] = useState("")
  const [showExPicker, setShowExPicker] = useState(false)
  const [showCreateEx, setShowCreateEx] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const allEx = getAllExercises()

  const filtered = allEx.filter((ex) =>
    !search || ex.name.toLowerCase().includes(search.toLowerCase()) || ex.muscle_groups.some((m) => m.toLowerCase().includes(search.toLowerCase()))
  )

  function toggleExercise(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id))
      setTargets((prev) => prev.filter((t) => t.exerciseId !== id))
    } else {
      setSelectedIds((prev) => [...prev, id])
      setTargets((prev) => [
        ...prev,
        { exerciseId: id, targetSets: 3, targetReps: 10, targetWeightKg: null, targetDurationSecs: null },
      ])
    }
  }

  function updateTarget(t: ExerciseTarget) {
    setTargets((prev) => prev.map((x) => (x.exerciseId === t.exerciseId ? t : x)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || selectedIds.length === 0) return
    onSave({ name: name.trim(), workoutTypeId: typeId, exerciseIds: selectedIds, targets, estimatedMinutes: minutes })
  }

  const selectedExercises = selectedIds
    .map((id) => allExercises.find((ex) => ex.id === id))
    .filter(Boolean) as Exercise[]

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#121212", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "95dvh", overflowY: "auto", padding: "1.5rem 1rem" }} onClick={(e) => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
            {initial ? "Editar Treino" : "Criar Treino Personalizado"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#b3b3b3", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Name */}
          <div>
            <label style={LABEL_STYLE}>Nome do treino *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Full Body A" required style={INPUT_STYLE} />
          </div>

          {/* Type + Duration */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>Tipo</label>
              <select value={typeId} onChange={(e) => setTypeId(e.target.value)} style={INPUT_STYLE}>
                {MOCK_WORKOUT_TYPES.map((wt) => (
                  <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={LABEL_STYLE}>Duração (min)</label>
              <input type="number" min={5} max={180} value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                style={{ ...INPUT_STYLE, textAlign: "center" }} inputMode="numeric" />
            </div>
          </div>

          {/* Exercise picker toggle */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>
                Exercícios * ({selectedIds.length} selecionado{selectedIds.length !== 1 ? "s" : ""})
              </label>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <button type="button" onClick={() => { setShowCreateEx(true); setShowExPicker(false) }}
                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, padding: "0.25rem 0.625rem", fontSize: "0.75rem", color: "#8b5cf6", cursor: "pointer" }}>
                  + Criar
                </button>
                <button type="button" onClick={() => setShowExPicker((v) => !v)}
                  style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.3)", borderRadius: 8, padding: "0.25rem 0.625rem", fontSize: "0.75rem", color: "#1db954", cursor: "pointer" }}>
                  {showExPicker ? "Fechar" : "Selecionar"}
                </button>
              </div>
            </div>

            {showExPicker && (
              <div style={{ marginBottom: "0.75rem" }}>
                <input key={refreshKey} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar exercício..."
                  style={{ ...INPUT_STYLE, marginBottom: "0.5rem" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxHeight: "28dvh", overflowY: "auto" }}>
                  {filtered.map((ex) => {
                    const selected = selectedIds.includes(ex.id)
                    return (
                      <button key={ex.id} type="button" onClick={() => toggleExercise(ex.id)}
                        style={{
                          background: selected ? "rgba(29,185,84,0.1)" : "#1e1e1e",
                          border: `1px solid ${selected ? "rgba(29,185,84,0.3)" : "rgba(255,255,255,0.06)"}`,
                          borderRadius: 10, padding: "0.5rem 0.75rem",
                          display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", textAlign: "left",
                        }}>
                        <span>{selected ? "✅" : "⬜"}</span>
                        <div>
                          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: selected ? "#1db954" : "#fff" }}>{ex.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "#6a6a6a" }}>{ex.muscle_groups.join(", ")}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected exercises with targets */}
          {selectedExercises.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ ...LABEL_STYLE, marginBottom: 0 }}>Metas por exercício</span>
              {selectedExercises.map((ex) => {
                const t = targets.find((t) => t.exerciseId === ex.id) ?? {
                  exerciseId: ex.id, targetSets: 3, targetReps: 10, targetWeightKg: null, targetDurationSecs: null,
                }
                return (
                  <ExerciseTargetRow
                    key={ex.id}
                    exercise={ex}
                    target={t}
                    onChange={updateTarget}
                    onRemove={() => toggleExercise(ex.id)}
                  />
                )
              })}
            </div>
          )}

          <button type="submit" disabled={!name.trim() || selectedIds.length === 0}
            style={{
              background: name.trim() && selectedIds.length > 0 ? "#1db954" : "#282828",
              color: name.trim() && selectedIds.length > 0 ? "#000" : "#6a6a6a",
              border: "none", borderRadius: 12, padding: "0.875rem",
              fontSize: "0.9rem", fontWeight: 800, cursor: "pointer", width: "100%",
            }}>
            {initial ? "Salvar Alterações" : "Criar Treino"}
          </button>
        </form>

        {showCreateEx && (
          <CreateExerciseModal
            onSave={(data) => {
              saveCustomExercise(data)
              setRefreshKey((k) => k + 1)
              setShowCreateEx(false)
              setShowExPicker(true)
            }}
            onClose={() => setShowCreateEx(false)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Create/Edit exercise modal ───────────────────────────────────────────────

function CreateExerciseModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CustomExercise
  onSave: (data: Omit<CustomExercise, 'id' | 'createdAt' | 'isCustom'>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [typeId, setTypeId] = useState(initial?.workout_type_id ?? "wt-1")
  const [muscles, setMuscles] = useState(initial?.muscle_groups.join(", ") ?? "")
  const [equipment, setEquipment] = useState(initial?.equipment.join(", ") ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      workout_type_id: typeId,
      muscle_groups: muscles.split(",").map((s) => s.trim()).filter(Boolean),
      equipment: equipment.split(",").map((s) => s.trim()).filter(Boolean),
      instructions: null,
    })
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#181818", borderRadius: 16, padding: "1.5rem 1.25rem", width: "100%", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
            {initial ? "Editar Exercício" : "Criar Exercício Personalizado"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#b3b3b3", fontSize: "1.25rem", cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div>
            <label style={LABEL_STYLE}>Nome *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Remada Unilateral" required style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Categoria</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} style={INPUT_STYLE}>
              {MOCK_WORKOUT_TYPES.map((wt) => (
                <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Músculos (separados por vírgula)</label>
            <input value={muscles} onChange={(e) => setMuscles(e.target.value)} placeholder="costas, bíceps" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Equipamento (separado por vírgula)</label>
            <input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="haltere, banco" style={INPUT_STYLE} />
          </div>
          <button type="submit" disabled={!name.trim()}
            style={{
              background: name.trim() ? "#8b5cf6" : "#282828",
              color: name.trim() ? "#fff" : "#6a6a6a",
              border: "none", borderRadius: 12, padding: "0.875rem",
              fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", width: "100%", marginTop: "0.25rem",
            }}>
            {initial ? "Salvar" : "Criar Exercício"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Exercise library sheet ───────────────────────────────────────────────────

function ExerciseHistoryModal({
  exercise,
  onClose,
}: {
  exercise: Exercise & { isCustom?: boolean }
  onClose: () => void
}) {
  const history = getExerciseHistory(exercise.id)
  const pb = getExercisePersonalBest(exercise.id)
  const suggestion = suggestProgression(exercise.id, null)

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 250, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#121212", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "80dvh", overflowY: "auto", padding: "1.5rem 1rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff" }}>{exercise.name}</h3>
            <div style={{ fontSize: "0.75rem", color: "#6a6a6a" }}>{exercise.muscle_groups.join(", ")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#b3b3b3", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
        </div>

        {/* PR and suggestion */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {pb > 0 && (
            <div style={{ flex: 1, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recorde (PR)</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b" }}>{pb}kg</div>
            </div>
          )}
          <div style={{ flex: 1, background: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 12, padding: "0.75rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#1db954", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Sugestão</div>
            <div style={{ fontSize: "0.8rem", color: "#b3b3b3" }}>{suggestion.note}</div>
          </div>
        </div>

        {/* History */}
        {history.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6a6a6a", padding: "2rem 0" }}>
            Nenhum registro ainda.<br />
            <span style={{ fontSize: "0.8rem" }}>Execute este exercício em uma sessão para ver o histórico.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {history.slice(0, 10).map((record, i) => (
              <div key={i} style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {record.sets.map((set, j) => (
                    <span key={j} style={{
                      background: set.isPr ? "rgba(245,158,11,0.12)" : "#282828",
                      border: `1px solid ${set.isPr ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 8, padding: "3px 8px",
                      fontSize: "0.8rem", color: set.isPr ? "#f59e0b" : "#b3b3b3",
                    }}>
                      {set.weight_kg > 0 ? `${set.weight_kg}kg × ` : ""}{set.reps}
                      {set.isPr ? " 🏆" : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Exercise library page ────────────────────────────────────────────────────

function ExerciseLibraryView({
  onClose,
}: {
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<(Exercise & { isCustom?: boolean }) | null>(null)
  const [showCreateEx, setShowCreateEx] = useState(false)
  const [editingEx, setEditingEx] = useState<CustomExercise | null>(null)
  const [customExs, setCustomExs] = useState<CustomExercise[]>([])
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => { setCustomExs(getCustomExercises()) }, [])

  const allEx = getAllExercises()
  const filtered = allEx.filter((ex) => {
    const matchType = typeFilter === "all" || ex.workout_type_id === typeFilter
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase()) || ex.muscle_groups.some((m) => m.toLowerCase().includes(search.toLowerCase()))
    return matchType && matchSearch
  })

  function handleDeleteEx(id: string) {
    if (!window.confirm("Excluir exercício personalizado?")) return
    deleteCustomExercise(id)
    setCustomExs((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0d0d", zIndex: 180, overflowY: "auto" }}>
      <div style={{ padding: "1rem", maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#b3b3b3", fontSize: "1.5rem", cursor: "pointer", padding: "0.25rem" }}>←</button>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff" }}>Biblioteca de Exercícios</h2>
          <button onClick={() => setShowCreateEx(true)}
            style={{ marginLeft: "auto", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 9999, padding: "0.375rem 0.875rem", fontSize: "0.75rem", color: "#8b5cf6", cursor: "pointer" }}>
            + Criar
          </button>
        </div>

        {/* Type filter */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {[{ id: "all", label: "Todos" }, ...MOCK_WORKOUT_TYPES.map((wt) => ({ id: wt.id, label: wt.name }))].map((f) => (
            <button key={f.id} onClick={() => setTypeFilter(f.id)}
              style={{
                padding: "0.25rem 0.75rem", borderRadius: 9999, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: "1px solid",
                background: typeFilter === f.id ? "rgba(29,185,84,0.15)" : "rgba(255,255,255,0.04)",
                borderColor: typeFilter === f.id ? "rgba(29,185,84,0.4)" : "rgba(255,255,255,0.08)",
                color: typeFilter === f.id ? "#1db954" : "#b3b3b3",
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar exercício ou músculo..."
          style={{ ...INPUT_STYLE, marginBottom: "0.75rem" }} />

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {filtered.map((ex) => {
            const isCustom = ex.id.startsWith("cx-")
            const pb = getExercisePersonalBest(ex.id)
            const hasHistory = getExerciseHistory(ex.id).length > 0
            const customEx = isCustom ? customExs.find((c) => c.id === ex.id) : undefined

            return (
              <div key={ex.id} style={{
                background: "#181818",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12, padding: "0.75rem 1rem",
                display: "flex", alignItems: "center", gap: "0.75rem",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fff" }}>{ex.name}</span>
                    {isCustom && (
                      <span style={{ fontSize: "0.65rem", background: "rgba(139,92,246,0.15)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 9999, padding: "1px 6px" }}>custom</span>
                    )}
                    {pb > 0 && (
                      <span style={{ fontSize: "0.65rem", background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 9999, padding: "1px 6px" }}>
                        PR {pb}kg
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#6a6a6a" }}>{ex.muscle_groups.join(", ")}</div>
                </div>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  {isCustom && customEx && (
                    <>
                      <button onClick={() => setEditingEx(customEx)}
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.25rem 0.5rem", color: "#b3b3b3", cursor: "pointer", fontSize: "0.8rem" }}>✏️</button>
                      <button onClick={() => handleDeleteEx(ex.id)}
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.25rem 0.5rem", color: "#6a6a6a", cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>
                    </>
                  )}
                  {hasHistory && (
                    <button onClick={() => setSelected(ex as Exercise & { isCustom?: boolean })}
                      style={{ background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.25)", borderRadius: 8, padding: "0.25rem 0.625rem", color: "#1db954", cursor: "pointer", fontSize: "0.75rem" }}>
                      Histórico
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <ExerciseHistoryModal exercise={selected} onClose={() => setSelected(null)} />
      )}

      {showCreateEx && (
        <CreateExerciseModal
          onSave={(data) => {
            const saved = saveCustomExercise(data)
            setCustomExs((prev) => [saved, ...prev])
            setShowCreateEx(false)
          }}
          onClose={() => setShowCreateEx(false)}
        />
      )}

      {editingEx && (
        <CreateExerciseModal
          initial={editingEx}
          onSave={(data) => {
            updateCustomExercise(editingEx.id, data)
            setCustomExs(getCustomExercises())
            setEditingEx(null)
          }}
          onClose={() => setEditingEx(null)}
        />
      )}
    </div>
  )
}

// ─── Time filter ──────────────────────────────────────────────────────────────

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
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set())

  const loadWorkouts = useCallback(() => {
    const allEx = getAllExercises()
    const cws = getCustomWorkouts()
    setCustomWorkouts(cws.map((cw) => toMockWorkoutShape(cw, allEx) as AnyWorkout))
  }, [])

  useEffect(() => {
    loadWorkouts()
    const prefs = getPreferences()
    const recs = getWorkoutRecommendations(prefs, 3)
    setRecommendedIds(new Set(recs.map((r) => r.workout.id)))
  }, [loadWorkouts])

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

  function handleSaveWorkout(data: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editingWorkout) {
      updateCustomWorkout(editingWorkout.id, data)
    } else {
      saveCustomWorkout(data)
    }
    loadWorkouts()
    setShowBuilder(false)
    setEditingWorkout(null)
  }

  function handleEdit(workout: AnyWorkout) {
    const raw = getCustomWorkouts().find((w) => w.id === workout.id)
    if (raw) { setEditingWorkout(raw); setShowBuilder(true) }
  }

  function handleDuplicate(id: string) {
    duplicateCustomWorkout(id)
    loadWorkouts()
  }

  function handleDeleteCustom(id: string) {
    if (!window.confirm("Excluir este treino personalizado?")) return
    deleteCustomWorkout(id)
    loadWorkouts()
  }

  const allWorkouts: AnyWorkout[] = [...customWorkouts, ...MOCK_WORKOUTS]
  const visible = filterByTime(allWorkouts, timeFilter)

  const timeFilters: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'quick', label: '≤ 25min' },
    { key: 'medium', label: '25–45min' },
    { key: 'long', label: '> 45min' },
  ]

  if (showLibrary) {
    return <ExerciseLibraryView onClose={() => { setShowLibrary(false); loadWorkouts() }} />
  }

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
          <button className="btn btn--ghost" onClick={() => setShowLibrary(true)}
            style={{ fontSize: "var(--text-xs)", padding: "0.375rem 0.875rem" }}>
            📚 Biblioteca
          </button>
          <button className="btn btn--primary" onClick={() => { setEditingWorkout(null); setShowBuilder(true) }}
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
            onEdit={workout.isCustom ? () => handleEdit(workout) : undefined}
            onDuplicate={workout.isCustom ? () => handleDuplicate(workout.id) : undefined}
            isRecommended={recommendedIds.has(workout.id)}
          />
        ))
      )}

      {showBuilder && (
        <WorkoutBuilderModal
          initial={editingWorkout ?? undefined}
          onSave={handleSaveWorkout}
          onClose={() => { setShowBuilder(false); setEditingWorkout(null) }}
        />
      )}
    </div>
  )
}
