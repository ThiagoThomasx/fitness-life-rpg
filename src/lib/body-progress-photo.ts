// Fotos privadas de progresso — Sprint 19 Parte 2.
// Modelo de dados e configuração da feature. As fotos em si (blob + thumbnail)
// vivem apenas no IndexedDB (`body-progress-photo-db.ts`), nunca em
// localStorage e nunca em backup JSON — ver `backup.ts` e SPRINT-19-PART2.md.
// Cada foto pertence a exatamente um `BodyProgressEntry` (sem reuso entre
// registros); nenhuma análise corporal ou inferência visual é feita aqui.

export type BodyProgressPhotoCategory = 'front' | 'side' | 'back' | 'other'

export const BODY_PHOTO_CATEGORY_LABELS: Record<BodyProgressPhotoCategory, string> = {
  front: 'Frente',
  side: 'Lateral',
  back: 'Costas',
  other: 'Outra',
}

export type BodyProgressPhotoMimeType = 'image/jpeg' | 'image/png' | 'image/webp'

/** Metadados de uma foto — retornados por listagens que não precisam do blob em memória. */
export interface BodyProgressPhoto {
  id: string
  entryId: string // registro corporal dono desta foto (relação 1:1, sem reuso)
  category: BodyProgressPhotoCategory
  takenAt: string // YYYY-MM-DD
  mimeType: BodyProgressPhotoMimeType
  width: number
  height: number
  sizeBytes: number
  createdAt: string
  updatedAt: string
}

/** Registro completo, incluindo os blobs — usado para leitura/gravação no IndexedDB. */
export interface BodyProgressPhotoRecord extends BodyProgressPhoto {
  blob: Blob
  thumbnailBlob: Blob
}

export type BodyPhotoValidationError =
  | { type: 'invalid-mime'; detail: string }
  | { type: 'empty-file' }
  | { type: 'too-large'; maxBytes: number; actualBytes: number }
  | { type: 'invalid-dimensions'; detail: string }
  | { type: 'max-per-entry-exceeded'; max: number }
  | { type: 'decode-failed' }

export interface BodyPhotoConfig {
  /** Tamanho máximo do arquivo original aceito, antes de qualquer processamento. */
  maxOriginalBytes: number
  /** Lado maior da imagem principal após redimensionamento. */
  maxDimensionPx: number
  /** Lado maior da miniatura gerada para listas/galeria. */
  thumbnailDimensionPx: number
  /** Qualidade de compressão JPEG (0..1) aplicada à imagem principal e à miniatura. */
  jpegQuality: number
  /** Número máximo de fotos vinculadas a um único registro corporal. */
  maxPhotosPerEntry: number
  acceptedMimeTypes: readonly BodyProgressPhotoMimeType[]
}

export const DEFAULT_BODY_PHOTO_CONFIG: BodyPhotoConfig = {
  maxOriginalBytes: 15 * 1024 * 1024,
  maxDimensionPx: 1600,
  thumbnailDimensionPx: 320,
  jpegQuality: 0.82,
  maxPhotosPerEntry: 6,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
}
