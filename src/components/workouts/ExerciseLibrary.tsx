"use client"

import { useEffect, useState } from "react"
import type { Exercise } from "@/types/database"
import { MOCK_WORKOUT_TYPES } from "@/lib/mock/data"
import {
  getAllExercises,
  getCustomExercises,
  saveCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  type CustomExercise,
} from "@/lib/custom-workouts"
import { getExercisePersonalBest, getExerciseHistory } from "@/lib/workout-history"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { CreateExerciseModal } from "./CreateExerciseModal"
import { ExerciseHistoryModal } from "./ExerciseHistoryModal"

type ExerciseLibraryProps = {
  onClose: () => void
}

export function ExerciseLibrary({ onClose }: ExerciseLibraryProps) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [showCreateEx, setShowCreateEx] = useState(false)
  const [editingEx, setEditingEx] = useState<CustomExercise | null>(null)
  const [deletingEx, setDeletingEx] = useState<CustomExercise | null>(null)
  const [customExs, setCustomExs] = useState<CustomExercise[]>([])
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => { setCustomExs(getCustomExercises()) }, [])

  const allExercises = getAllExercises()
  const filtered = allExercises.filter((ex) => {
    const matchType = typeFilter === "all" || ex.workout_type_id === typeFilter
    const matchSearch =
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscle_groups.some((m) => m.toLowerCase().includes(search.toLowerCase()))
    return matchType && matchSearch
  })

  function confirmDeleteExercise() {
    if (!deletingEx) return
    deleteCustomExercise(deletingEx.id)
    setCustomExs((prev) => prev.filter((e) => e.id !== deletingEx.id))
    setDeletingEx(null)
  }

  const typeFilters = [
    { id: "all", label: "Todos" },
    ...MOCK_WORKOUT_TYPES.map((wt) => ({ id: wt.id, label: wt.name })),
  ]

  return (
    <div className="library-screen">
      <div className="page">
        <div className="flex items-center gap-3">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Voltar para Treinos">
            ←
          </button>
          <h2 className="text-lg font-bold text-primary">Biblioteca de exercícios</h2>
          <button
            type="button"
            className="btn btn--primary ml-auto"
            style={{ padding: "var(--space-2) var(--space-4)" }}
            onClick={() => setShowCreateEx(true)}
          >
            + Criar
          </button>
        </div>

        <div className="filter-row" role="group" aria-label="Filtrar exercícios por tipo">
          {typeFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={typeFilter === f.id ? "filter-pill filter-pill--active" : "filter-pill"}
              aria-pressed={typeFilter === f.id}
              onClick={() => setTypeFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar exercício ou músculo..."
          aria-label="Buscar exercício ou músculo"
        />

        <div className="flex flex-col gap-1.5">
          {filtered.map((ex) => {
            const isCustom = ex.id.startsWith("cx-")
            const personalBest = getExercisePersonalBest(ex.id)
            const hasHistory = getExerciseHistory(ex.id).length > 0
            const customEx = isCustom ? customExs.find((c) => c.id === ex.id) : undefined

            return (
              <div key={ex.id} className="library-row">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-primary">{ex.name}</span>
                    {isCustom && (
                      <span className="badge-pill badge-pill--level" style={{ fontSize: "0.6rem" }}>
                        custom
                      </span>
                    )}
                    {personalBest > 0 && (
                      <span className="badge-pill badge-pill--streak" style={{ fontSize: "0.6rem" }}>
                        PR {personalBest}kg
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted">{ex.muscle_groups.join(", ")}</div>
                </div>
                <div className="flex flex-shrink-0 gap-1.5">
                  {isCustom && customEx && (
                    <>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditingEx(customEx)}
                        aria-label={`Editar exercício ${ex.name}`}
                      >✏️</button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setDeletingEx(customEx)}
                        aria-label={`Excluir exercício ${ex.name}`}
                      >🗑️</button>
                    </>
                  )}
                  {hasHistory && (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)" }}
                      onClick={() => setSelected(ex)}
                    >
                      Histórico
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && <ExerciseHistoryModal exercise={selected} onClose={() => setSelected(null)} />}

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

      {deletingEx && (
        <ConfirmDialog
          title="Excluir exercício?"
          description={`"${deletingEx.name}" será removido da sua biblioteca. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          isDanger
          onConfirm={confirmDeleteExercise}
          onCancel={() => setDeletingEx(null)}
        />
      )}
    </div>
  )
}
