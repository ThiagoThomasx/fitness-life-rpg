"use client"

import { useId, useState } from "react"
import { MOCK_WORKOUT_TYPES } from "@/lib/mock/data"
import type { CustomExercise } from "@/lib/custom-workouts"
import { ModalShell } from "@/components/ui/ModalShell"

type CreateExerciseModalProps = {
  initial?: CustomExercise
  onSave: (data: Omit<CustomExercise, "id" | "createdAt" | "isCustom">) => void
  onClose: () => void
}

export function CreateExerciseModal({ initial, onSave, onClose }: CreateExerciseModalProps) {
  const titleId = useId()
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
    <ModalShell labelledBy={titleId} onClose={onClose}>
      <div className="modal-header">
        <h3 id={titleId} className="modal-title">
          {initial ? "Editar exercício" : "Criar exercício"}
        </h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label" htmlFor={`${titleId}-name`}>Nome *</label>
          <input
            id={`${titleId}-name`}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Remada Unilateral"
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${titleId}-type`}>Categoria</label>
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
        <div>
          <label className="field-label" htmlFor={`${titleId}-muscles`}>
            Músculos (separados por vírgula)
          </label>
          <input
            id={`${titleId}-muscles`}
            className="input"
            value={muscles}
            onChange={(e) => setMuscles(e.target.value)}
            placeholder="costas, bíceps"
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${titleId}-equipment`}>
            Equipamento (separado por vírgula)
          </label>
          <input
            id={`${titleId}-equipment`}
            className="input"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="haltere, banco"
          />
        </div>
        <button type="submit" className="btn btn--primary btn--full" disabled={!name.trim()}>
          {initial ? "Salvar" : "Criar exercício"}
        </button>
      </form>
    </ModalShell>
  )
}
