"use client"

import { useEffect, useState } from "react"
import { DEFAULT_BODY_PHOTO_CONFIG, type BodyProgressPhoto } from "@/lib/body-progress-photo"
import { validatePhotoFile } from "@/lib/body-progress-photo-validation"
import { processPhotoFile } from "@/lib/body-progress-photo-processing"
import { savePhoto, getPhotoMetadata, deletePhoto as deletePhotoRecord } from "@/lib/body-progress-photo-db"
import { linkPhotoToEntry, unlinkPhotoFromEntry } from "@/lib/body-progress-photo-link"
import { hasAcknowledgedBodyPhotosPrivacy, acknowledgeBodyPhotosPrivacy } from "@/lib/preferences"
import { describePhotoValidationError, describePhotoDbError } from "@/lib/body-progress-photo-errors"
import { PhotoPrivacyNotice } from "./PhotoPrivacyNotice"
import { PhotoThumbnailImg } from "./PhotoThumbnailImg"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

type BodyProgressPhotoSectionProps = {
  entryId: string
  initialPhotoIds?: string[]
}

function makePhotoId(): string {
  return `body-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function BodyProgressPhotoSection({ entryId, initialPhotoIds }: BodyProgressPhotoSectionProps) {
  const [photoIds, setPhotoIds] = useState<string[]>(initialPhotoIds ?? [])
  const [photos, setPhotos] = useState<BodyProgressPhoto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(photoIds.map((id) => getPhotoMetadata(id))).then((results) => {
      if (cancelled) return
      setPhotos(
        results
          .filter((r): r is { ok: true; value: BodyProgressPhoto } => r.ok && r.value !== undefined)
          .map((r) => r.value)
      )
    })
    return () => {
      cancelled = true
    }
  }, [photoIds])

  async function uploadFile(file: File) {
    setIsProcessing(true)
    setError(null)
    try {
      const processed = await processPhotoFile(file)
      if (!processed.ok) {
        setError(describePhotoValidationError(processed.error))
        return
      }

      const id = makePhotoId()
      const now = new Date().toISOString()
      const saveResult = await savePhoto({
        id,
        entryId,
        category: "other",
        takenAt: now.slice(0, 10),
        mimeType: processed.value.mimeType,
        width: processed.value.width,
        height: processed.value.height,
        sizeBytes: processed.value.blob.size,
        createdAt: now,
        updatedAt: now,
        blob: processed.value.blob,
        thumbnailBlob: processed.value.thumbnailBlob,
      })
      if (!saveResult.ok) {
        setError(describePhotoDbError(saveResult.error))
        return
      }

      const linked = await linkPhotoToEntry(entryId, id)
      if (!linked) {
        await deletePhotoRecord(id)
        setError("Não foi possível vincular a foto a este registro.")
        return
      }
      setPhotoIds((prev) => [...prev, id])
    } finally {
      setIsProcessing(false)
    }
  }

  function handleFileSelected(file: File) {
    const validationError = validatePhotoFile(file, photoIds.length)
    if (validationError) {
      setError(describePhotoValidationError(validationError))
      return
    }
    setError(null)
    if (!hasAcknowledgedBodyPhotosPrivacy()) {
      setPendingFile(file)
      return
    }
    void uploadFile(file)
  }

  function handlePrivacyAcknowledge() {
    acknowledgeBodyPhotosPrivacy()
    const file = pendingFile
    setPendingFile(null)
    if (file) void uploadFile(file)
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    await unlinkPhotoFromEntry(entryId, id)
    await deletePhotoRecord(id)
    setPhotoIds((prev) => prev.filter((photoId) => photoId !== id))
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {photos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "0.75rem" }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ position: "relative" }}>
              <PhotoThumbnailImg photoId={photo.id} alt={`Foto de progresso registrada em ${photo.takenAt}`} />
              <button
                type="button"
                onClick={() => setConfirmDeleteId(photo.id)}
                aria-label="Excluir foto"
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 20, height: 20, borderRadius: "50%",
                  border: "none", background: "var(--color-danger)", color: "white",
                  fontSize: "0.7rem", lineHeight: 1, cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept={DEFAULT_BODY_PHOTO_CONFIG.acceptedMimeTypes.join(",")}
        disabled={isProcessing || photoIds.length >= DEFAULT_BODY_PHOTO_CONFIG.maxPhotosPerEntry}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) handleFileSelected(file)
        }}
        style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}
        aria-label="Adicionar foto de progresso"
      />

      {isProcessing && (
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 6 }}>Processando imagem…</p>
      )}

      {error && (
        <p role="alert" style={{ fontSize: "0.75rem", color: "var(--color-danger)", marginTop: 6 }}>
          {error}
        </p>
      )}

      {pendingFile && (
        <PhotoPrivacyNotice
          onAcknowledge={handlePrivacyAcknowledge}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Excluir esta foto?"
          description="A imagem será removida permanentemente deste navegador."
          confirmLabel="Excluir"
          isDanger
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
