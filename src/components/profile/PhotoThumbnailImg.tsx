"use client"

import { useEffect, useState } from "react"
import { getPhotoRecord } from "@/lib/body-progress-photo-db"
import { useObjectUrl } from "@/hooks/useObjectUrl"

type PhotoThumbnailImgProps = {
  photoId: string
  alt: string
  size?: number
  /** Usa o blob completo em vez da miniatura — para o modal de detalhe/comparação. */
  useFullBlob?: boolean
}

/**
 * Carrega o blob (miniatura por padrão) de uma foto do IndexedDB e a exibe
 * como `<img src="blob:...">`, revogando a URL ao desmontar/trocar de foto
 * via `useObjectUrl`. Referências quebradas (foto ausente do IndexedDB)
 * mostram um placeholder neutro em vez de quebrar a tela.
 */
export function PhotoThumbnailImg({ photoId, alt, size = 72, useFullBlob = false }: PhotoThumbnailImgProps) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setBlob(null)
    setFailed(false)
    getPhotoRecord(photoId).then((result) => {
      if (cancelled) return
      if (result.ok && result.value) {
        setBlob(useFullBlob ? result.value.blob : result.value.thumbnailBlob)
      } else {
        setFailed(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [photoId, useFullBlob])

  const url = useObjectUrl(blob)

  if (failed) {
    return (
      <div
        role="img"
        aria-label="Foto indisponível"
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "var(--color-bg-subtle)",
          border: "1px dashed var(--color-border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.65rem",
          color: "var(--color-text-muted)",
          textAlign: "center",
          padding: 4,
        }}
      >
        Foto indisponível
      </div>
    )
  }

  if (!url) {
    return <div style={{ width: size, height: size, borderRadius: 10, background: "var(--color-bg-subtle)" }} />
  }

  // next/image não suporta URLs blob: — <img> é a opção correta aqui.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 10, objectFit: "cover" }}
    />
  )
}
