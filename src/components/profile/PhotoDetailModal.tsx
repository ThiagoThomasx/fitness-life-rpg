"use client"

import { useEffect, useId, useState } from "react"
import { BODY_PHOTO_CATEGORY_LABELS, type BodyProgressPhoto, type BodyProgressPhotoCategory } from "@/lib/body-progress-photo"
import { getPhotoMetadata, updatePhotoMetadata, deletePhoto as deletePhotoRecord } from "@/lib/body-progress-photo-db"
import { unlinkPhotoFromEntry } from "@/lib/body-progress-photo-link"
import { ModalShell } from "@/components/ui/ModalShell"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { PhotoThumbnailImg } from "./PhotoThumbnailImg"

type PhotoDetailModalProps = {
  photoId: string
  entryId: string
  onClose: () => void
  /** Chamado após exclusão definitiva OU remoção de uma referência quebrada — o chamador deve atualizar a lista de fotos do registro. */
  onChanged: () => void
}

const CATEGORY_OPTIONS = Object.keys(BODY_PHOTO_CATEGORY_LABELS) as BodyProgressPhotoCategory[]

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

export function PhotoDetailModal({ photoId, entryId, onClose, onChanged }: PhotoDetailModalProps) {
  const titleId = useId()
  const [photo, setPhoto] = useState<BodyProgressPhoto | null | undefined>(undefined)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPhotoMetadata(photoId).then((result) => {
      if (!cancelled) setPhoto(result.ok && result.value ? result.value : null)
    })
    return () => {
      cancelled = true
    }
  }, [photoId])

  async function handleCategoryChange(category: BodyProgressPhotoCategory) {
    const result = await updatePhotoMetadata(photoId, { category })
    if (result.ok && result.value) setPhoto(result.value)
  }

  async function handleRemoveBrokenReference() {
    await unlinkPhotoFromEntry(entryId, photoId)
    onChanged()
    onClose()
  }

  async function handleConfirmDelete() {
    setConfirmingDelete(false)
    await unlinkPhotoFromEntry(entryId, photoId)
    await deletePhotoRecord(photoId)
    onChanged()
    onClose()
  }

  if (photo === undefined) {
    return (
      <ModalShell labelledBy={titleId} onClose={onClose}>
        <h3 id={titleId} className="modal-title">Carregando…</h3>
      </ModalShell>
    )
  }

  if (photo === null) {
    return (
      <ModalShell labelledBy={titleId} onClose={onClose}>
        <h3 id={titleId} className="modal-title">Foto indisponível</h3>
        <p className="mt-2 text-sm text-secondary">
          Esta foto não foi encontrada neste navegador — pode ter sido apagada ou este registro foi restaurado a
          partir de um backup que não inclui imagens.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Fechar</button>
          <button type="button" className="btn btn--danger" onClick={handleRemoveBrokenReference}>
            Remover referência
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell labelledBy={titleId} onClose={onClose}>
      <h3 id={titleId} className="modal-title">Foto de {formatDate(photo.takenAt)}</h3>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
        <PhotoThumbnailImg photoId={photo.id} alt={`Foto de progresso ${BODY_PHOTO_CATEGORY_LABELS[photo.category].toLowerCase()} registrada em ${formatDate(photo.takenAt)}`} size={280} useFullBlob />
      </div>

      <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500, display: "block", marginTop: 12, marginBottom: 6 }}>
        Categoria
      </label>
      <select
        value={photo.category}
        onChange={(e) => handleCategoryChange(e.target.value as BodyProgressPhotoCategory)}
        style={{
          width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
          border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)",
          color: "var(--color-text-primary)", fontSize: "var(--text-sm)",
        }}
      >
        {CATEGORY_OPTIONS.map((category) => (
          <option key={category} value={category}>{BODY_PHOTO_CATEGORY_LABELS[category]}</option>
        ))}
      </select>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn--ghost" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn--danger" onClick={() => setConfirmingDelete(true)}>
          Excluir
        </button>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Excluir esta foto?"
          description="A imagem será removida permanentemente deste navegador."
          confirmLabel="Excluir"
          isDanger
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </ModalShell>
  )
}
