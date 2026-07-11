"use client"

import { useId } from "react"
import { ModalShell } from "./ModalShell"

type ConfirmDialogProps = {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  isDanger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Voltar",
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()

  return (
    <ModalShell labelledBy={titleId} onClose={onCancel}>
      <h3 id={titleId} className="modal-title">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-secondary" style={{ lineHeight: "var(--leading-normal)" }}>
          {description}
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={isDanger ? "btn btn--danger" : "btn btn--primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
