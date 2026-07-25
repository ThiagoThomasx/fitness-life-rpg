"use client"

import { useId, useState } from "react"
import type { Exercise } from "@/types/database"
import { getAllExercises } from "@/lib/custom-workouts"
import { ModalShell } from "@/components/ui/ModalShell"
import type { ExerciseSubstitutionReason } from "@/lib/active-workout"

const REASON_LABELS: Record<ExerciseSubstitutionReason, string> = {
  equipment: "Equipamento indisponível",
  availability: "Espaço ocupado",
  comfort: "Conforto",
  pain: "Dor/desconforto",
  preference: "Preferência",
  variation: "Variação",
  other: "Outro",
}

const REASON_KEYS = Object.keys(REASON_LABELS) as ExerciseSubstitutionReason[]

type ExerciseSubstitutionDialogProps = {
  plannedExerciseName: string
  excludeExerciseIds: string[]
  onConfirm: (replacement: Exercise, reason: ExerciseSubstitutionReason | undefined, note: string | undefined) => void
  onClose: () => void
}

/**
 * Fluxo em 2 passos (Fase 13): escolher substituto no catálogo existente,
 * depois revisar/confirmar com motivo opcional. Não copia carga/reps/RIR/RPE
 * do exercício planejado automaticamente (Fase 15) — isso é decisão do
 * usuário na própria tela de execução, depois de confirmar aqui.
 */
export function ExerciseSubstitutionDialog({
  plannedExerciseName,
  excludeExerciseIds,
  onConfirm,
  onClose,
}: ExerciseSubstitutionDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [reason, setReason] = useState<ExerciseSubstitutionReason | undefined>(undefined)
  const [note, setNote] = useState("")

  if (!selected) {
    return (
      <ModalShell labelledBy={titleId} variant="sheet" onClose={onClose}>
        <div className="modal-header">
          <h3 id={titleId} className="modal-title">Substituir {plannedExerciseName}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {getAllExercises()
            .filter((exercise) => !excludeExerciseIds.includes(exercise.id))
            .map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="picker-row"
                onClick={() => setSelected(exercise)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-primary">{exercise.name}</span>
                  <span className="block truncate text-xs text-muted">{exercise.muscle_groups.join(", ")}</span>
                </span>
              </button>
            ))}
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell labelledBy={titleId} describedBy={descriptionId} onClose={onClose}>
      <h3 id={titleId} className="modal-title">Confirmar substituição</h3>
      <p id={descriptionId} className="mt-2 text-sm text-secondary">
        {plannedExerciseName} → <strong className="text-primary">{selected.name}</strong>
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <span className="text-xs text-muted">Motivo (opcional)</span>
        <div className="filter-row" role="group" aria-label="Motivo da substituição">
          {REASON_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={reason === key ? "filter-pill filter-pill--active" : "filter-pill"}
              aria-pressed={reason === key}
              onClick={() => setReason(reason === key ? undefined : key)}
            >
              {REASON_LABELS[key]}
            </button>
          ))}
        </div>

        <label className="text-xs text-muted" htmlFor={`${titleId}-note`}>
          Observação (opcional)
        </label>
        <textarea
          id={`${titleId}-note`}
          className="textarea"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn--ghost" onClick={() => setSelected(null)}>
          Voltar
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onConfirm(selected, reason, note.trim() || undefined)}
        >
          Confirmar substituição
        </button>
      </div>
    </ModalShell>
  )
}
