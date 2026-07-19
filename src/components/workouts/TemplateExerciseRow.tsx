"use client"

import { useId, useState } from "react"
import type { WorkoutTemplateExercise } from "@/lib/workout-templates"

type TemplateExerciseRowProps = {
  exercise: WorkoutTemplateExercise
  index: number
  total: number
  onChange: (exercise: WorkoutTemplateExercise) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export function TemplateExerciseRow({
  exercise,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TemplateExerciseRowProps) {
  const fieldId = useId()
  const [newAlternative, setNewAlternative] = useState("")

  function addAlternative() {
    const name = newAlternative.trim()
    if (!name) return
    onChange({
      ...exercise,
      alternatives: [...(exercise.alternatives ?? []), { exerciseName: name }],
    })
    setNewAlternative("")
  }

  function removeAlternative(idx: number) {
    onChange({ ...exercise, alternatives: (exercise.alternatives ?? []).filter((_, i) => i !== idx) })
  }

  return (
    <div className="target-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{exercise.exerciseName}</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Mover ${exercise.exerciseName} para cima`}
            title="Mover para cima"
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={`Mover ${exercise.exerciseName} para baixo`}
            title="Mover para baixo"
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onRemove}
            aria-label={`Remover ${exercise.exerciseName} do template`}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="target-inputs">
        <div className="target-input">
          <label className="field-label" htmlFor={`${fieldId}-sets`}>Séries</label>
          <input
            id={`${fieldId}-sets`}
            className="input"
            type="number"
            min={1}
            max={20}
            value={exercise.sets ?? ""}
            placeholder="—"
            onChange={(e) => onChange({ ...exercise, sets: e.target.value ? Number(e.target.value) : undefined })}
            inputMode="numeric"
          />
        </div>
        <div className="target-input">
          <label className="field-label" htmlFor={`${fieldId}-reps`}>Reps</label>
          <input
            id={`${fieldId}-reps`}
            className="input"
            value={exercise.reps ?? ""}
            placeholder="Ex: 8-10"
            onChange={(e) => onChange({ ...exercise, reps: e.target.value || undefined })}
          />
        </div>
        <div className="target-input target-input--wide">
          <label className="field-label" htmlFor={`${fieldId}-load`}>Carga (kg)</label>
          <input
            id={`${fieldId}-load`}
            className="input"
            type="number"
            min={0}
            step={0.5}
            value={exercise.loadKg ?? ""}
            placeholder="—"
            onChange={(e) => onChange({ ...exercise, loadKg: e.target.value ? Number(e.target.value) : undefined })}
            inputMode="decimal"
          />
        </div>
        <div className="target-input target-input--wide">
          <label className="field-label" htmlFor={`${fieldId}-rest`}>Descanso (s)</label>
          <input
            id={`${fieldId}-rest`}
            className="input"
            type="number"
            min={0}
            step={5}
            value={exercise.restSeconds ?? ""}
            placeholder="—"
            onChange={(e) =>
              onChange({ ...exercise, restSeconds: e.target.value ? Number(e.target.value) : undefined })
            }
            inputMode="numeric"
          />
        </div>
        <div className="target-input">
          <label className="field-label" htmlFor={`${fieldId}-rir`}>RIR</label>
          <input
            id={`${fieldId}-rir`}
            className="input"
            type="number"
            min={0}
            max={10}
            value={exercise.rir ?? ""}
            placeholder="—"
            onChange={(e) => onChange({ ...exercise, rir: e.target.value ? Number(e.target.value) : undefined })}
            inputMode="numeric"
          />
        </div>
        <div className="target-input">
          <label className="field-label" htmlFor={`${fieldId}-rpe`}>RPE</label>
          <input
            id={`${fieldId}-rpe`}
            className="input"
            type="number"
            min={0}
            max={10}
            value={exercise.rpe ?? ""}
            placeholder="—"
            onChange={(e) => onChange({ ...exercise, rpe: e.target.value ? Number(e.target.value) : undefined })}
            inputMode="numeric"
          />
        </div>
        <div className="target-input">
          <label className="field-label" htmlFor={`${fieldId}-tempo`}>Tempo</label>
          <input
            id={`${fieldId}-tempo`}
            className="input"
            value={exercise.tempo ?? ""}
            placeholder="Ex: 3-1-1"
            onChange={(e) => onChange({ ...exercise, tempo: e.target.value || undefined })}
          />
        </div>
      </div>

      <div style={{ marginTop: "var(--space-2)" }}>
        <label className="field-label" htmlFor={`${fieldId}-notes`}>Notas</label>
        <input
          id={`${fieldId}-notes`}
          className="input"
          value={exercise.notes ?? ""}
          placeholder="Observações sobre execução"
          onChange={(e) => onChange({ ...exercise, notes: e.target.value || undefined })}
        />
      </div>

      <div style={{ marginTop: "var(--space-2)" }}>
        <span className="field-label">Alternativas</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(exercise.alternatives ?? []).map((alt, idx) => (
            <span key={`${alt.exerciseName}-${idx}`} className="tag-chip tag-chip--removable">
              {alt.exerciseName}
              <button
                type="button"
                className="tag-chip__remove"
                onClick={() => removeAlternative(idx)}
                aria-label={`Remover alternativa ${alt.exerciseName}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            value={newAlternative}
            onChange={(e) => setNewAlternative(e.target.value)}
            placeholder="Ex: Supino com halteres"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addAlternative()
              }
            }}
          />
          <button type="button" className="btn btn--secondary" onClick={addAlternative}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
