// IndexedDB wrapper para fotos privadas de progresso — Sprint 19 Parte 2.
// Único uso de IndexedDB no app (ver ARCHITECTURE.md): blobs de imagem não
// cabem bem em localStorage. Toda função aqui verifica disponibilidade do
// IndexedDB e nunca lança — mutadores retornam `PhotoDbResult`, leituras
// retornam uma forma neutra (`[]`/`null`/`0`) quando o IndexedDB está
// indisponível (navegador sem suporte, modo privado restritivo, etc.). Toda
// conexão aberta é fechada em um `finally`, inclusive quando a transação
// falha, para nunca deixar um handle pendurado bloqueando outra aba/teste.

import type { BodyProgressPhoto, BodyProgressPhotoRecord } from './body-progress-photo'

const DB_NAME = 'lrpg-fit-photos'
const DB_VERSION = 1
const STORE_NAME = 'photos'

export type PhotoDbError = 'indexeddb-unavailable' | 'quota-exceeded' | 'not-found' | 'unknown'

export interface PhotoDbResult<T> {
  ok: boolean
  value?: T
  error?: PhotoDbError
}

export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB != null
}

function unavailableResult<T>(): PhotoDbResult<T> {
  return { ok: false, error: 'indexeddb-unavailable' }
}

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('by-entryId', 'entryId', { unique: false })
        store.createIndex('by-takenAt', 'takenAt', { unique: false })
        store.createIndex('by-category', 'category', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Abre a base, executa `run` sobre uma transação, e SEMPRE fecha a conexão ao final. */
async function withTransaction<T>(mode: IDBTransactionMode, run: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openPhotoDb()
  try {
    const tx = db.transaction(STORE_NAME, mode)
    return await run(tx)
  } finally {
    db.close()
  }
}

function toMetadata(record: BodyProgressPhotoRecord): BodyProgressPhoto {
  return {
    id: record.id,
    entryId: record.entryId,
    category: record.category,
    takenAt: record.takenAt,
    mimeType: record.mimeType,
    width: record.width,
    height: record.height,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

// ─── Mutators ───────────────────────────────────────────────────────────────

export async function savePhoto(record: BodyProgressPhotoRecord): Promise<PhotoDbResult<BodyProgressPhoto>> {
  if (!isIndexedDBAvailable()) return unavailableResult()
  try {
    await withTransaction('readwrite', async (tx) => {
      tx.objectStore(STORE_NAME).put(record)
      await transactionDone(tx)
    })
    return { ok: true, value: toMetadata(record) }
  } catch (error) {
    if (isQuotaExceeded(error)) return { ok: false, error: 'quota-exceeded' }
    return { ok: false, error: 'unknown' }
  }
}

export async function updatePhotoMetadata(
  id: string,
  patch: Partial<Pick<BodyProgressPhoto, 'category' | 'takenAt'>>
): Promise<PhotoDbResult<BodyProgressPhoto>> {
  if (!isIndexedDBAvailable()) return unavailableResult()
  try {
    const updated = await withTransaction('readwrite', async (tx) => {
      const store = tx.objectStore(STORE_NAME)
      const existing = await requestToPromise<BodyProgressPhotoRecord | undefined>(store.get(id))
      if (!existing) return null
      const next: BodyProgressPhotoRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() }
      store.put(next)
      await transactionDone(tx)
      return next
    })
    if (!updated) return { ok: false, error: 'not-found' }
    return { ok: true, value: toMetadata(updated) }
  } catch (error) {
    if (isQuotaExceeded(error)) return { ok: false, error: 'quota-exceeded' }
    return { ok: false, error: 'unknown' }
  }
}

export async function deletePhoto(id: string): Promise<PhotoDbResult<void>> {
  if (!isIndexedDBAvailable()) return unavailableResult()
  try {
    const existed = await withTransaction('readwrite', async (tx) => {
      const store = tx.objectStore(STORE_NAME)
      const existing = await requestToPromise<BodyProgressPhotoRecord | undefined>(store.get(id))
      if (!existing) return false
      store.delete(id)
      await transactionDone(tx)
      return true
    })
    if (!existed) return { ok: false, error: 'not-found' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'unknown' }
  }
}

export async function deleteManyPhotos(ids: string[]): Promise<{ deleted: number; failed: number }> {
  const results = await Promise.all(ids.map((id) => deletePhoto(id)))
  const deleted = results.filter((r) => r.ok).length
  return { deleted, failed: results.length - deleted }
}

export async function clearAllPhotos(): Promise<PhotoDbResult<void>> {
  if (!isIndexedDBAvailable()) return unavailableResult()
  try {
    await withTransaction('readwrite', async (tx) => {
      tx.objectStore(STORE_NAME).clear()
      await transactionDone(tx)
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'unknown' }
  }
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getPhotoRecord(id: string): Promise<PhotoDbResult<BodyProgressPhotoRecord>> {
  if (!isIndexedDBAvailable()) return unavailableResult()
  try {
    const record = await withTransaction('readonly', (tx) =>
      requestToPromise<BodyProgressPhotoRecord | undefined>(tx.objectStore(STORE_NAME).get(id))
    )
    if (!record) return { ok: false, error: 'not-found' }
    return { ok: true, value: record }
  } catch {
    return { ok: false, error: 'unknown' }
  }
}

export async function getPhotoMetadata(id: string): Promise<PhotoDbResult<BodyProgressPhoto>> {
  const result = await getPhotoRecord(id)
  if (!result.ok || !result.value) return { ok: false, error: result.error }
  return { ok: true, value: toMetadata(result.value) }
}

export async function getManyPhotoRecords(ids: string[]): Promise<BodyProgressPhotoRecord[]> {
  const results = await Promise.all(ids.map((id) => getPhotoRecord(id)))
  const records: BodyProgressPhotoRecord[] = []
  for (const result of results) {
    if (result.ok && result.value) records.push(result.value)
  }
  return records
}

export async function listPhotoMetadataByEntry(entryId: string): Promise<BodyProgressPhoto[]> {
  if (!isIndexedDBAvailable()) return []
  try {
    const records = await withTransaction('readonly', (tx) => {
      const index = tx.objectStore(STORE_NAME).index('by-entryId')
      return requestToPromise<BodyProgressPhotoRecord[]>(index.getAll(entryId))
    })
    return records.map(toMetadata)
  } catch {
    return []
  }
}

export async function countPhotos(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0
  try {
    return await withTransaction('readonly', (tx) => requestToPromise<number>(tx.objectStore(STORE_NAME).count()))
  } catch {
    return 0
  }
}

// ─── Orphan cleanup ─────────────────────────────────────────────────────────

export async function findOrphanPhotoIds(validEntryIds: Set<string>): Promise<string[]> {
  if (!isIndexedDBAvailable()) return []
  try {
    const all = await withTransaction('readonly', (tx) =>
      requestToPromise<BodyProgressPhotoRecord[]>(tx.objectStore(STORE_NAME).getAll())
    )
    return all.filter((r) => !validEntryIds.has(r.entryId)).map((r) => r.id)
  } catch {
    return []
  }
}

export async function cleanupOrphanPhotos(validEntryIds: Set<string>): Promise<{ deleted: number }> {
  const orphanIds = await findOrphanPhotoIds(validEntryIds)
  const { deleted } = await deleteManyPhotos(orphanIds)
  return { deleted }
}
