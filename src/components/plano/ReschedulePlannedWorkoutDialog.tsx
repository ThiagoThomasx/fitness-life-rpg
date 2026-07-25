"use client"

import { useId, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import { checkRescheduleConflict, type PlannedWorkout } from "@/lib/planned-workouts"

type ReschedulePlannedWorkoutDialogProps = {
  workout: PlannedWorkout
  onConfirm: (newDate: string, reason?: string) => void
  onCancel: () => void
}

/** Sprint 21 Parte 2 — só relata conflito (Fase 14 do módulo), nunca substitui a sessão do outro dia automaticamente. */
export function ReschedulePlannedWorkoutDialog({ workout, onConfirm, onCancel }: ReschedulePlannedWorkoutDialogProps) {
  const titleId = useId()
  const [newDate, setNewDate] = useState(workout.date)
  const [reason, setReason] = useState("")

  const conflicts = newDate && newDate !== workout.date ? checkRescheduleConflict(newDate) : []

  return (
    <ModalShell labelledBy={titleId} onClose={onCancel}>
      <h3 id={titleId} className="modal-title">Reagendar &quot;{workout.name}&quot;</h3>
      <p className="mt-2 text-xs text-muted">Data original: {workout.date}</p>

      <label className="text-xs text-muted" htmlFor={`${titleId}-date`} style={{ marginTop: "var(--space-3)", display: "block" }}>
        Nova data
      </label>
      <input
        id={`${titleId}-date`}
        type="date"
        className="input"
        value={newDate}
        onChange={(e) => setNewDate(e.target.value)}
        style={{ marginTop: "var(--space-1)" }}
      />

      {conflicts.length > 0 && (
        <p className="text-xs" style={{ marginTop: "var(--space-2)", color: "var(--color-warning, #d9822b)" }} role="status">
          Já existe{conflicts.length > 1 ? "m" : ""} {conflicts.length} sessão(ões) planejada(s) para {newDate}.
          O treino será movido mesmo assim, sem substituir as demais.
        </p>
      )}

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
        <button
          type="button"
          className="btn btn--primary"
          disabled={!newDate || newDate === workout.date}
          onClick={() => onConfirm(newDate, reason.trim() || undefined)}
        >
          Reagendar
        </button>
      </div>
    </ModalShell>
  )
}
