"use client"

import { useId, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import type { SkippedWorkoutReason } from "@/lib/planned-workouts"

const REASON_LABELS: Record<SkippedWorkoutReason, string> = {
  schedule: "Falta de tempo",
  recovery: "Baixa recuperação",
  health: "Dor ou desconforto",
  travel: "Viagem",
  equipment: "Equipamento indisponível",
  personal: "Trabalho ou compromisso",
  other: "Outro",
}

type SkipPlannedWorkoutDialogProps = {
  workoutName: string
  onConfirm: (reason?: SkippedWorkoutReason, note?: string) => void
  onCancel: () => void
}

/** Sprint 21 Parte 2 — motivo sempre opcional, nunca usado para julgar (ver CLAUDE.md / PROGRAM-ADHERENCE). */
export function SkipPlannedWorkoutDialog({ workoutName, onConfirm, onCancel }: SkipPlannedWorkoutDialogProps) {
  const titleId = useId()
  const [reason, setReason] = useState<SkippedWorkoutReason | "">("")
  const [note, setNote] = useState("")

  return (
    <ModalShell labelledBy={titleId} onClose={onCancel}>
      <h3 id={titleId} className="modal-title">Ignorar &quot;{workoutName}&quot;?</h3>
      <p className="mt-2 text-sm text-secondary" style={{ lineHeight: "var(--leading-normal)" }}>
        A sessão continua fazendo parte do plano — só registra que não foi realizada. O motivo é opcional.
      </p>

      <label className="text-xs text-muted" htmlFor={`${titleId}-reason`} style={{ marginTop: "var(--space-3)", display: "block" }}>
        Motivo (opcional)
      </label>
      <select
        id={`${titleId}-reason`}
        className="input"
        value={reason}
        onChange={(e) => setReason(e.target.value as SkippedWorkoutReason | "")}
        style={{ marginTop: "var(--space-1)" }}
      >
        <option value="">Sem motivo especificado</option>
        {(Object.keys(REASON_LABELS) as SkippedWorkoutReason[]).map((key) => (
          <option key={key} value={key}>{REASON_LABELS[key]}</option>
        ))}
      </select>

      <label className="text-xs text-muted" htmlFor={`${titleId}-note`} style={{ marginTop: "var(--space-3)", display: "block" }}>
        Nota (opcional)
      </label>
      <textarea
        id={`${titleId}-note`}
        className="input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        style={{ marginTop: "var(--space-1)", resize: "vertical" }}
      />

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Voltar</button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onConfirm(reason || undefined, note.trim() || undefined)}
        >
          Ignorar treino
        </button>
      </div>
    </ModalShell>
  )
}
