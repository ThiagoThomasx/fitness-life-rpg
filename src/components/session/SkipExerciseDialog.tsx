"use client"

import { useId } from "react"
import { ModalShell } from "@/components/ui/ModalShell"

type SkipExerciseDialogProps = {
  exerciseName: string
  onKeepSets: () => void
  onClearSets: () => void
  onCancel: () => void
}

/** Só aparece quando o exercício já tem séries registradas (Fase 16/21) — sem séries, marcar direto. */
export function SkipExerciseDialog({ exerciseName, onKeepSets, onClearSets, onCancel }: SkipExerciseDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <ModalShell labelledBy={titleId} describedBy={descriptionId} onClose={onCancel}>
      <h3 id={titleId} className="modal-title">Marcar &quot;{exerciseName}&quot; como não realizado?</h3>
      <p id={descriptionId} className="mt-2 text-sm text-secondary" style={{ lineHeight: "var(--leading-normal)" }}>
        Este exercício já tem séries registradas. Elas podem continuar salvas ou ser limpas.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button type="button" className="btn btn--primary" onClick={onKeepSets}>
          Manter séries registradas
        </button>
        <button type="button" className="btn btn--danger" onClick={onClearSets}>
          Limpar séries e marcar
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </ModalShell>
  )
}
