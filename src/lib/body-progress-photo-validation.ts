// Validação de arquivos de foto — Sprint 19 Parte 2. Puro: não decodifica
// imagem, não toca canvas nem IndexedDB, por isso é fácil de testar isolado.

import { DEFAULT_BODY_PHOTO_CONFIG, type BodyPhotoConfig, type BodyPhotoValidationError } from './body-progress-photo'

/** Valida um `File` recém-selecionado, antes de qualquer decodificação. */
export function validatePhotoFile(
  file: File,
  existingCountForEntry: number,
  config: BodyPhotoConfig = DEFAULT_BODY_PHOTO_CONFIG
): BodyPhotoValidationError | null {
  if (file.size === 0) return { type: 'empty-file' }

  if (!config.acceptedMimeTypes.includes(file.type as BodyPhotoConfig['acceptedMimeTypes'][number])) {
    return { type: 'invalid-mime', detail: file.type || 'desconhecido' }
  }

  if (file.size > config.maxOriginalBytes) {
    return { type: 'too-large', maxBytes: config.maxOriginalBytes, actualBytes: file.size }
  }

  if (existingCountForEntry >= config.maxPhotosPerEntry) {
    return { type: 'max-per-entry-exceeded', max: config.maxPhotosPerEntry }
  }

  return null
}

/** Valida dimensões após a decodificação — não é possível saber isso a partir do `File` sozinho. */
export function validateDecodedDimensions(width: number, height: number): BodyPhotoValidationError | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return { type: 'invalid-dimensions', detail: `${width}x${height}` }
  }
  return null
}
