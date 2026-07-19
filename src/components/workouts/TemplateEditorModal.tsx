"use client"

import { useId, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import { getAllExercises } from "@/lib/custom-workouts"
import {
  saveWorkoutTemplate,
  updateWorkoutTemplate,
  WORKOUT_TEMPLATE_OBJECTIVE_LABELS,
  WORKOUT_TEMPLATE_DIFFICULTY_LABELS,
  type WorkoutTemplate,
  type WorkoutTemplateExercise,
  type WorkoutTemplateExerciseBlock,
  type WorkoutTemplateObjective,
  type WorkoutTemplateDifficulty,
} from "@/lib/workout-templates"
import { TemplateExerciseRow } from "./TemplateExerciseRow"

type TemplateEditorModalProps = {
  initial?: WorkoutTemplate
  onSaved: (template: WorkoutTemplate) => void
  onClose: () => void
}

function newBlock(exerciseId: string | undefined, exerciseName: string): WorkoutTemplateExerciseBlock {
  return {
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "single",
    exercise: {
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exerciseId,
      exerciseName,
      sets: 3,
      reps: "8-10",
      restSeconds: 90,
    },
  }
}

export function TemplateEditorModal({ initial, onSaved, onClose }: TemplateEditorModalProps) {
  const titleId = useId()
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [objective, setObjective] = useState<WorkoutTemplateObjective | "">(initial?.objective ?? "")
  const [difficulty, setDifficulty] = useState<WorkoutTemplateDifficulty | "">(initial?.difficulty ?? "")
  const [minutes, setMinutes] = useState<number | "">(initial?.estimatedDurationMinutes ?? "")
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [blocks, setBlocks] = useState<WorkoutTemplateExerciseBlock[]>(initial?.exerciseBlocks ?? [])
  const [search, setSearch] = useState("")
  const [showPicker, setShowPicker] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const allExercises = getAllExercises()
  const filtered = allExercises.filter(
    (ex) =>
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscle_groups.some((m) => m.toLowerCase().includes(search.toLowerCase()))
  )

  const canSubmit = Boolean(name.trim()) && blocks.length > 0

  function addExercise(exerciseId: string, exerciseName: string) {
    setBlocks((prev) => [...prev, newBlock(exerciseId, exerciseName)])
  }

  function updateBlockExercise(blockId: string, exercise: WorkoutTemplateExercise) {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, exercise } : b)))
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function addTag() {
    const tag = tagInput.trim()
    if (!tag || tags.includes(tag)) return
    setTags((prev) => [...prev, tag])
    setTagInput("")
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      objective: objective || undefined,
      difficulty: difficulty || undefined,
      estimatedDurationMinutes: minutes === "" ? undefined : Number(minutes),
      exerciseBlocks: blocks,
      tags,
    }

    const result = initial ? updateWorkoutTemplate(initial.id, payload) : saveWorkoutTemplate(payload)

    if (!result.ok || !result.template) {
      setErrors((result.errors ?? []).map((e) => e.message))
      return
    }

    onSaved(result.template)
  }

  return (
    <ModalShell labelledBy={titleId} variant="sheet" onClose={onClose}>
      <div className="modal-header">
        <h3 id={titleId} className="modal-title">
          {initial ? "Editar template" : "Criar template"}
        </h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      {initial && initial.version > 1 && (
        <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
          Alterações serão aplicadas apenas aos próximos usos deste template.
        </p>
      )}

      {errors.length > 0 && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label" htmlFor={`${titleId}-name`}>Nome do template *</label>
          <input
            id={`${titleId}-name`}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Treino A — Peito e Tríceps"
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor={`${titleId}-desc`}>Descrição</label>
          <input
            id={`${titleId}-desc`}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="field-label" htmlFor={`${titleId}-objective`}>Objetivo</label>
            <select
              id={`${titleId}-objective`}
              className="select"
              value={objective}
              onChange={(e) => setObjective(e.target.value as WorkoutTemplateObjective | "")}
            >
              <option value="">—</option>
              {Object.entries(WORKOUT_TEMPLATE_OBJECTIVE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="field-label" htmlFor={`${titleId}-difficulty`}>Dificuldade</label>
            <select
              id={`${titleId}-difficulty`}
              className="select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as WorkoutTemplateDifficulty | "")}
            >
              <option value="">—</option>
              {Object.entries(WORKOUT_TEMPLATE_DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
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
              onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : "")}
              inputMode="numeric"
              style={{ textAlign: "center" }}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor={`${titleId}-tags`}>Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span key={tag} className="tag-chip tag-chip--removable">
                {tag}
                <button type="button" className="tag-chip__remove" onClick={() => removeTag(tag)} aria-label={`Remover tag ${tag}`}>
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              id={`${titleId}-tags`}
              className="input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Ex: peito, empurrar"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag()
                }
              }}
            />
            <button type="button" className="btn btn--secondary" onClick={addTag}>
              Adicionar
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="field-label" style={{ marginBottom: 0 }}>
              Exercícios * ({blocks.length} selecionado{blocks.length !== 1 ? "s" : ""})
            </span>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)" }}
              onClick={() => setShowPicker((v) => !v)}
              aria-expanded={showPicker}
            >
              {showPicker ? "Fechar" : "Adicionar exercício"}
            </button>
          </div>

          {showPicker && (
            <div className="mb-3">
              <input
                className="input mb-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar exercício..."
                aria-label="Buscar exercício"
              />
              <div className="picker-list">
                {filtered.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    className="picker-row"
                    onClick={() => addExercise(ex.id, ex.name)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-primary">{ex.name}</span>
                      <span className="block truncate text-xs text-muted">{ex.muscle_groups.join(", ")}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {blocks.length > 0 && (
          <div className="flex flex-col gap-2">
            {blocks.map((block, index) => (
              <TemplateExerciseRow
                key={block.id}
                exercise={block.exercise}
                index={index}
                total={blocks.length}
                onChange={(exercise) => updateBlockExercise(block.id, exercise)}
                onRemove={() => removeBlock(block.id)}
                onMoveUp={() => moveBlock(index, -1)}
                onMoveDown={() => moveBlock(index, 1)}
              />
            ))}
          </div>
        )}

        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={!canSubmit}>
          {initial ? "Salvar alterações" : "Criar template"}
        </button>
      </form>
    </ModalShell>
  )
}
