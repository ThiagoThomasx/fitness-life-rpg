"use client"

import { useId, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"

type CancelPlannedWorkoutDialogProps = {
  workoutName: string
  onConfirm: (reason?: string) => void
  onCancel: () => void
}

/** Sprint 21 Parte 2 — cancelar é diferente de ignorar: a sessão deixa de fazer parte do plano. */
export function CancelPlannedWorkoutDialog({ workoutName, onConfirm, onCancel }: CancelPlannedWorkoutDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [reason, setReason] = useState("")

  return (
    <ModalShell labelledBy={titleId} describedBy={descriptionId} onClose={onCancel}>
      <h3 id={titleId} className="modal-title">Cancelar &quot;{workoutName}&quot;?</h3>
      <p id={descriptionId} className="mt-2 text-sm text-secondary" style={{ lineHeight: "var(--leading-normal)" }}>
        Use quando a sessão deixou de fazer parte do plano — diferente de &quot;ignorar&quot;, que ainda a considera planejada.
        Não conta como falta de aderência.
      </p>

      <label className="text-xs text-muted" htmlFor={`${titleId}-reason`} style={{ marginTop: "var(--space-3)", display: "block" }}>
        Motivo (opcional)
      </label>
      <textarea
        id={`${titleId}-reason`}
        className="input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        style={{ marginTop: "var(--space-1)", resize: "vertical" }}
      />

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Voltar</button>
        <button type="button" className="btn btn--danger" onClick={() => onConfirm(reason.trim() || undefined)}>
          Cancelar treino
        </button>
      </div>
    </ModalShell>
  )
}
