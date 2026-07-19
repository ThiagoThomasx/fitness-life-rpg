"use client"

import { PhotoThumbnailImg } from "./PhotoThumbnailImg"

type BodyProgressPhotoGalleryProps = {
  photoIds: string[]
  onSelectPhoto: (photoId: string) => void
}

/**
 * Grade de miniaturas de um registro corporal. Referências quebradas (id
 * presente mas foto ausente do IndexedDB) ainda são clicáveis — o modal de
 * detalhe é quem trata esse caso, oferecendo remover a referência.
 */
export function BodyProgressPhotoGallery({ photoIds, onSelectPhoto }: BodyProgressPhotoGalleryProps) {
  if (photoIds.length === 0) return null

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {photoIds.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelectPhoto(id)}
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
        >
          <PhotoThumbnailImg photoId={id} alt="Foto de progresso" size={56} />
        </button>
      ))}
    </div>
  )
}
