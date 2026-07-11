"use client"

import { useId, useState } from "react"
import { MOCK_WORKOUT_TYPES } from "@/lib/mock/data"
import type { Exercise } from "@/types/database"
import {
  getAllExercises,
  saveCustomExercise,
  type CustomWorkout,
  type ExerciseTarget,
} from "@/lib/custom-workouts"
import { ModalShell } from "@/components/ui/ModalShell"
import { CreateExerciseModal } from "./CreateExerciseModal"

const DEFAULT_TARGET: Omit<ExerciseTarget, "exerciseId"> = {
  targetSets: 3,
  targetReps: 10,
  targetWeightKg: null,
  targetDurationSecs: null,
}

// ─── Metas por exercício ─────────────────────────────────────────────────────

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
  const fieldId = useId()

  return (
    <div className="target-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{exercise.name}</span>
        <button
          type="button"
          className="icon-btn"
          onClick={onRemove}
          aria-label={`Remover ${exercise.name} do treino`}
        >
          ✕
        </button>
      </div>
      <div className="text-xs text-muted">{exercise.muscle_groups.join(", ")}</div>
      <div className="target-inputs">
        <div className="target-input">
          <label className="field-label" htmlFor={`${fieldId}-sets`}>Séries</label>
          <input
            id={`${fieldId}-sets`}
            className="input"
            type="number"
            min={1}
            max={20}
            value={target.targetSets}
            onChange={(e) => onChange({ ...target, targetSets: Number(e.target.value) })}
            inputMode="numeric"
          />
        </div>
        <div className="target-input">
          <label className="field-label" htmlFor={`${fieldId}-reps`}>Reps</label>
          <input
            id={`${fieldId}-reps`}
            className="input"
            type="number"
            min={1}
            max={100}
            value={target.targetReps ?? ""}
            placeholder="—"
            onChange={(e) =>
              onChange({ ...target, targetReps: e.target.value ? Number(e.target.value) : null })
            }
            inputMode="numeric"
          />
        </div>
        <div className="target-input target-input--wide">
          <label className="field-label" htmlFor={`${fieldId}-weight`}>Peso (kg)</label>
          <input
            id={`${fieldId}-weight`}
            className="input"
            type="number"
            min={0}
            step={0.5}
            value={target.targetWeightKg ?? ""}
            placeholder="—"
            onChange={(e) =>
              onChange({ ...target, targetWeightKg: e.target.value ? Number(e.target.value) : null })
            }
            inputMode="decimal"
          />
        </div>
        <div className="target-input target-input--wide">
          <label className="field-label" htmlFor={`${fieldId}-duration`}>Duração (s)</label>
          <input
            id={`${fieldId}-duration`}
            className="input"
            type="number"
            min={0}
            step={5}
            value={target.targetDurationSecs ?? ""}
            placeholder="—"
            onChange={(e) =>
              onChange({
                ...target,
                targetDurationSecs: e.target.value ? Number(e.target.value) : null,
              })
            }
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Modal principal ─────────────────────────────────────────────────────────

type WorkoutBuilderModalProps = {
  initial?: CustomWorkout
  onSave: (data: Omit<CustomWorkout, "id" | "createdAt" | "updatedAt">) => void
  onClose: () => void
}

export function WorkoutBuilderModal({ initial, onSave, onClose }: WorkoutBuilderModalProps) {
  const titleId = useId()
  const [name, setName] = useState(initial?.name ?? "")
  const [typeId, setTypeId] = useState(initial?.workoutTypeId ?? "wt-1")
  const [minutes, setMinutes] = useState(initial?.estimatedMinutes ?? 40)
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.exerciseIds ?? [])
  const [targets, setTargets] = useState<ExerciseTarget[]>(initial?.targets ?? [])
  const [search, setSearch] = useState("")
  const [showExPicker, setShowExPicker] = useState(false)
  const [showCreateEx, setShowCreateEx] = useState(false)
  const [exerciseVersion, setExerciseVersion] = useState(0)

  // exerciseVersion força re-render quando um exercício novo é criado,
  // fazendo getAllExercises() reler o localStorage
  const allExercises = getAllExercises()

  const filtered = allExercises.filter(
    (ex) =>
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscle_groups.some((m) => m.toLowerCase().includes(search.toLowerCase()))
  )

  const canSubmit = Boolean(name.trim()) && selectedIds.length > 0

  function toggleExercise(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id))
      setTargets((prev) => prev.filter((t) => t.exerciseId !== id))
    } else {
      setSelectedIds((prev) => [...prev, id])
      setTargets((prev) => [...prev, { exerciseId: id, ...DEFAULT_TARGET }])
    }
  }

  function updateTarget(t: ExerciseTarget) {
    setTargets((prev) => prev.map((x) => (x.exerciseId === t.exerciseId ? t : x)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSave({
      name: name.trim(),
      workoutTypeId: typeId,
      exerciseIds: selectedIds,
      targets,
      estimatedMinutes: minutes,
    })
  }

  const selectedExercises = selectedIds
    .map((id) => allExercises.find((ex) => ex.id === id))
    .filter(Boolean) as Exercise[]

  return (
    <ModalShell labelledBy={titleId} variant="sheet" onClose={onClose}>
      <div className="modal-header">
        <h3 id={titleId} className="modal-title">
          {initial ? "Editar treino" : "Criar treino personalizado"}
        </h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label" htmlFor={`${titleId}-name`}>Nome do treino *</label>
          <input
            id={`${titleId}-name`}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Full Body A"
            required
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="field-label" htmlFor={`${titleId}-type`}>Tipo</label>
            <select
              id={`${titleId}-type`}
              className="select"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              {MOCK_WORKOUT_TYPES.map((wt) => (
                <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label className="field-label" htmlFor={`${titleId}-minutes`}>Duração (min)</label>
            <input
              id={`${titleId}-minutes`}
              className="input"
              type="number"
              min={5}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              inputMode="numeric"
              style={{ textAlign: "center" }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="field-label" style={{ marginBottom: 0 }}>
              Exercícios * ({selectedIds.length} selecionado{selectedIds.length !== 1 ? "s" : ""})
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="btn btn--ghost"
                style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)" }}
                onClick={() => { setShowCreateEx(true); setShowExPicker(false) }}
              >
                + Criar
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)" }}
                onClick={() => setShowExPicker((v) => !v)}
                aria-expanded={showExPicker}
              >
                {showExPicker ? "Fechar" : "Selecionar"}
              </button>
            </div>
          </div>

          {showExPicker && (
            <div className="mb-3">
              <input
                className="input mb-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar exercício..."
                aria-label="Buscar exercício"
              />
              <div className="picker-list" key={exerciseVersion}>
                {filtered.map((ex) => {
                  const selected = selectedIds.includes(ex.id)
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      className={selected ? "picker-row picker-row--selected" : "picker-row"}
                      aria-pressed={selected}
                      onClick={() => toggleExercise(ex.id)}
                    >
                      <span className="picker-row__check" aria-hidden="true">
                        {selected ? "✓" : ""}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-primary">
                          {ex.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {ex.muscle_groups.join(", ")}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {selectedExercises.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="field-label" style={{ marginBottom: 0 }}>Metas por exercício</span>
            {selectedExercises.map((ex) => {
              const target =
                targets.find((t) => t.exerciseId === ex.id) ?? { exerciseId: ex.id, ...DEFAULT_TARGET }
              return (
                <ExerciseTargetRow
                  key={ex.id}
                  exercise={ex}
                  target={target}
                  onChange={updateTarget}
                  onRemove={() => toggleExercise(ex.id)}
                />
              )
            })}
          </div>
        )}

        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={!canSubmit}>
          {initial ? "Salvar alterações" : "Criar treino"}
        </button>
      </form>

      {showCreateEx && (
        <CreateExerciseModal
          onSave={(data) => {
            saveCustomExercise(data)
            setExerciseVersion((v) => v + 1)
            setShowCreateEx(false)
            setShowExPicker(true)
          }}
          onClose={() => setShowCreateEx(false)}
        />
      )}
    </ModalShell>
  )
}
