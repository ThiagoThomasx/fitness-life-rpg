import { describe, it, expect, afterEach, vi } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import {
  savePhoto,
  getPhotoRecord,
  getPhotoMetadata,
  getManyPhotoRecords,
  listPhotoMetadataByEntry,
  updatePhotoMetadata,
  deletePhoto,
  deleteManyPhotos,
  findOrphanPhotoIds,
  cleanupOrphanPhotos,
  clearAllPhotos,
  countPhotos,
  isIndexedDBAvailable,
} from './body-progress-photo-db'
import type { BodyProgressPhotoRecord } from './body-progress-photo'

const DB_NAME = 'lrpg-fit-photos'

function deleteDb(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

afterEach(async () => {
  await deleteDb()
  vi.restoreAllMocks()
})

/**
 * `vi.stubGlobal`/`unstubAllGlobals` don't reliably restore `window.indexedDB`
 * across jsdom + fake-indexeddb, so unavailability is simulated with a manual
 * save/restore around the exact assertions that need it.
 */
async function withIndexedDBUnavailable(run: () => Promise<void>): Promise<void> {
  const original = window.indexedDB
  // @ts-expect-error simulating a browser without IndexedDB support
  window.indexedDB = undefined
  try {
    await run()
  } finally {
    window.indexedDB = original
  }
}

function makeRecord(overrides: Partial<BodyProgressPhotoRecord> = {}): BodyProgressPhotoRecord {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? `photo-${Math.random().toString(36).slice(2)}`,
    entryId: overrides.entryId ?? 'entry-1',
    category: overrides.category ?? 'front',
    takenAt: overrides.takenAt ?? '2026-08-01',
    mimeType: overrides.mimeType ?? 'image/jpeg',
    width: overrides.width ?? 800,
    height: overrides.height ?? 600,
    sizeBytes: overrides.sizeBytes ?? 12345,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    // Node's Blob (not jsdom's) — fake-indexeddb clones stored values via the
    // global `structuredClone`, which under jsdom's Blob class silently drops
    // the byte content (a known jsdom/Node interop gap, not a bug in our
    // code). Real browsers don't have this mismatch.
    blob: overrides.blob ?? (new NodeBlob(['fake-image-bytes'], { type: 'image/jpeg' }) as unknown as Blob),
    thumbnailBlob:
      overrides.thumbnailBlob ?? (new NodeBlob(['fake-thumb-bytes'], { type: 'image/jpeg' }) as unknown as Blob),
  }
}

describe('isIndexedDBAvailable', () => {
  it('returns true under the fake-indexeddb polyfill', () => {
    expect(isIndexedDBAvailable()).toBe(true)
  })

  it('returns false when indexedDB is unavailable', async () => {
    await withIndexedDBUnavailable(async () => {
      expect(isIndexedDBAvailable()).toBe(false)
    })
  })
})

describe('openPhotoDb (via savePhoto)', () => {
  it('creates the store and all three indexes on first use', async () => {
    await savePhoto(makeRecord())
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect(db.objectStoreNames.contains('photos')).toBe(true)
    const tx = db.transaction('photos', 'readonly')
    const store = tx.objectStore('photos')
    expect(Array.from(store.indexNames)).toEqual(
      expect.arrayContaining(['by-entryId', 'by-takenAt', 'by-category'])
    )
    db.close()
  })
})

describe('savePhoto / getPhotoRecord', () => {
  it('round-trips a record including blob bytes', async () => {
    const record = makeRecord({ id: 'photo-1' })
    const saveResult = await savePhoto(record)
    expect(saveResult.ok).toBe(true)
    expect(saveResult.value?.id).toBe('photo-1')

    const getResult = await getPhotoRecord('photo-1')
    expect(getResult.ok).toBe(true)
    expect(getResult.value?.id).toBe('photo-1')
    expect(getResult.value?.blob.size).toBe(record.blob.size)
    expect(getResult.value?.blob.type).toBe('image/jpeg')
  })

  it('returns not-found for a missing id', async () => {
    const result = await getPhotoRecord('missing')
    expect(result).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('getPhotoMetadata', () => {
  it('excludes blob fields', async () => {
    await savePhoto(makeRecord({ id: 'photo-1' }))
    const result = await getPhotoMetadata('photo-1')
    expect(result.ok).toBe(true)
    expect(result.value).not.toHaveProperty('blob')
    expect(result.value).not.toHaveProperty('thumbnailBlob')
    expect(result.value?.category).toBe('front')
  })
})

describe('getManyPhotoRecords', () => {
  it('returns only the records that exist, skipping missing ids', async () => {
    await savePhoto(makeRecord({ id: 'photo-1' }))
    await savePhoto(makeRecord({ id: 'photo-2' }))
    const records = await getManyPhotoRecords(['photo-1', 'missing', 'photo-2'])
    expect(records.map((r) => r.id).sort()).toEqual(['photo-1', 'photo-2'])
  })
})

describe('listPhotoMetadataByEntry', () => {
  it('returns only photos matching entryId, via the by-entryId index', async () => {
    await savePhoto(makeRecord({ id: 'photo-1', entryId: 'entry-a' }))
    await savePhoto(makeRecord({ id: 'photo-2', entryId: 'entry-a' }))
    await savePhoto(makeRecord({ id: 'photo-3', entryId: 'entry-b' }))

    const forA = await listPhotoMetadataByEntry('entry-a')
    expect(forA.map((p) => p.id).sort()).toEqual(['photo-1', 'photo-2'])

    const forC = await listPhotoMetadataByEntry('entry-c')
    expect(forC).toEqual([])
  })
})

describe('updatePhotoMetadata', () => {
  it('updates category/takenAt and returns a valid updatedAt timestamp', async () => {
    const saved = await savePhoto(makeRecord({ id: 'photo-1', category: 'front' }))
    const result = await updatePhotoMetadata('photo-1', { category: 'side' })
    expect(result.ok).toBe(true)
    expect(result.value?.category).toBe('side')
    expect(result.value?.updatedAt).toBeTruthy()
    expect(new Date(result.value!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(saved.value!.updatedAt).getTime()
    )
  })

  it('returns not-found for a missing id', async () => {
    const result = await updatePhotoMetadata('missing', { category: 'side' })
    expect(result).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('deletePhoto', () => {
  it('removes an existing record', async () => {
    await savePhoto(makeRecord({ id: 'photo-1' }))
    const result = await deletePhoto('photo-1')
    expect(result.ok).toBe(true)
    expect((await getPhotoRecord('photo-1')).ok).toBe(false)
  })

  it('returns not-found instead of throwing on a second delete', async () => {
    await savePhoto(makeRecord({ id: 'photo-1' }))
    await deletePhoto('photo-1')
    const second = await deletePhoto('photo-1')
    expect(second).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('deleteManyPhotos', () => {
  it('counts deleted vs failed', async () => {
    await savePhoto(makeRecord({ id: 'photo-1' }))
    await savePhoto(makeRecord({ id: 'photo-2' }))
    const result = await deleteManyPhotos(['photo-1', 'photo-2', 'missing'])
    expect(result).toEqual({ deleted: 2, failed: 1 })
  })
})

describe('findOrphanPhotoIds / cleanupOrphanPhotos', () => {
  it('detects photos whose entryId is not in the valid set', async () => {
    await savePhoto(makeRecord({ id: 'photo-1', entryId: 'entry-a' }))
    await savePhoto(makeRecord({ id: 'photo-2', entryId: 'entry-orphan' }))

    const orphans = await findOrphanPhotoIds(new Set(['entry-a']))
    expect(orphans).toEqual(['photo-2'])

    const cleanup = await cleanupOrphanPhotos(new Set(['entry-a']))
    expect(cleanup).toEqual({ deleted: 1 })
    expect((await getPhotoRecord('photo-1')).ok).toBe(true)
    expect((await getPhotoRecord('photo-2')).ok).toBe(false)
  })
})

describe('clearAllPhotos / countPhotos', () => {
  it('empties the store', async () => {
    await savePhoto(makeRecord({ id: 'photo-1' }))
    await savePhoto(makeRecord({ id: 'photo-2' }))
    expect(await countPhotos()).toBe(2)

    const result = await clearAllPhotos()
    expect(result.ok).toBe(true)
    expect(await countPhotos()).toBe(0)
  })
})

describe('quota exceeded handling', () => {
  it('returns quota-exceeded instead of throwing when put() fails', async () => {
    const putSpy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const result = await savePhoto(makeRecord({ id: 'photo-1' }))
    expect(result).toEqual({ ok: false, error: 'quota-exceeded' })
    putSpy.mockRestore()
  })
})

describe('IndexedDB unavailable fallback', () => {
  it('mutators return indexeddb-unavailable instead of throwing', async () => {
    await withIndexedDBUnavailable(async () => {
      expect(await savePhoto(makeRecord())).toEqual({ ok: false, error: 'indexeddb-unavailable' })
      expect(await deletePhoto('any')).toEqual({ ok: false, error: 'indexeddb-unavailable' })
      expect(await clearAllPhotos()).toEqual({ ok: false, error: 'indexeddb-unavailable' })
    })
  })

  it('reads return neutral empty shapes instead of throwing', async () => {
    await withIndexedDBUnavailable(async () => {
      expect(await getPhotoRecord('any')).toEqual({ ok: false, error: 'indexeddb-unavailable' })
      expect(await listPhotoMetadataByEntry('any')).toEqual([])
      expect(await getManyPhotoRecords(['a', 'b'])).toEqual([])
      expect(await countPhotos()).toBe(0)
      expect(await findOrphanPhotoIds(new Set())).toEqual([])
    })
  })
})
