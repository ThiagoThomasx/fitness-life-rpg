// Vínculo entre `BodyProgressEntry` (localStorage) e `BodyProgressPhoto`
// (IndexedDB) — Sprint 19 Parte 2. Módulo separado dos dois domínios para
// evitar import circular entre `body-progress.ts` e `body-progress-photo-db.ts`.
// Opção A: cada foto pertence a exatamente um registro, sem contagem de
// referências nem reuso entre registros.

import {
  getBodyProgressEntries,
  getBodyProgressEntryById,
  updateBodyProgressEntry,
  deleteBodyProgressEntry,
  type BodyProgressEntry,
} from './body-progress'
import { getPhotoMetadata, deleteManyPhotos } from './body-progress-photo-db'
import type { BodyProgressPhoto } from './body-progress-photo'

export interface ResolvedEntryPhoto {
  id: string
  /** `null` = referência quebrada (id presente em `photoIds` mas ausente do IndexedDB). */
  metadata: BodyProgressPhoto | null
}

/** Nunca lança em referência quebrada — o chamador decide como renderizar um placeholder. */
export async function resolveEntryPhotos(entry: BodyProgressEntry): Promise<ResolvedEntryPhoto[]> {
  const ids = Array.from(new Set(entry.photoIds ?? []))
  return Promise.all(
    ids.map(async (id) => {
      const result = await getPhotoMetadata(id)
      return { id, metadata: result.ok && result.value ? result.value : null }
    })
  )
}

export async function linkPhotoToEntry(entryId: string, photoId: string): Promise<boolean> {
  const entry = getBodyProgressEntryById(entryId)
  if (!entry) return false
  const nextIds = Array.from(new Set([...(entry.photoIds ?? []), photoId]))
  return updateBodyProgressEntry(entryId, { photoIds: nextIds }) !== null
}

export async function unlinkPhotoFromEntry(entryId: string, photoId: string): Promise<boolean> {
  const entry = getBodyProgressEntryById(entryId)
  if (!entry) return false
  const nextIds = (entry.photoIds ?? []).filter((id) => id !== photoId)
  return updateBodyProgressEntry(entryId, { photoIds: nextIds.length > 0 ? nextIds : undefined }) !== null
}

export interface DeleteEntryAndPhotosResult {
  entryDeleted: boolean
  photosDeleted: number
}

/**
 * Composição de `deleteBodyProgressEntry` (existente, inalterado) com a exclusão
 * das fotos vinculadas quando `deletePhotos` é true. Quando false, as fotos
 * viram órfãs intencionalmente — ainda limpáveis depois via `cleanupOrphanPhotos`.
 */
export async function deleteEntryAndPhotos(
  entryId: string,
  deletePhotos: boolean
): Promise<DeleteEntryAndPhotosResult> {
  const entry = getBodyProgressEntryById(entryId)
  const photoIds = entry?.photoIds ?? []
  const entryDeleted = deleteBodyProgressEntry(entryId)
  if (!entryDeleted) return { entryDeleted: false, photosDeleted: 0 }
  if (!deletePhotos || photoIds.length === 0) return { entryDeleted: true, photosDeleted: 0 }
  const { deleted } = await deleteManyPhotos(photoIds)
  return { entryDeleted: true, photosDeleted: deleted }
}

/** Usado pelo reset granular de fotos: remove `photoIds` de todos os registros, sem apagar os registros em si. */
export async function stripAllPhotoLinks(): Promise<void> {
  for (const entry of getBodyProgressEntries()) {
    if (entry.photoIds && entry.photoIds.length > 0) {
      updateBodyProgressEntry(entry.id, { photoIds: undefined })
    }
  }
}
