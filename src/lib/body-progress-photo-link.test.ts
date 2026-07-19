import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import { createBodyProgressEntry, getBodyProgressEntryById, getBodyProgressEntries } from './body-progress'
import { savePhoto, getPhotoRecord } from './body-progress-photo-db'
import {
  resolveEntryPhotos,
  linkPhotoToEntry,
  unlinkPhotoFromEntry,
  deleteEntryAndPhotos,
  stripAllPhotoLinks,
} from './body-progress-photo-link'
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

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(async () => {
  await deleteDb()
})

function makePhotoRecord(overrides: Partial<BodyProgressPhotoRecord> = {}): BodyProgressPhotoRecord {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? `photo-${Math.random().toString(36).slice(2)}`,
    entryId: overrides.entryId ?? 'entry-1',
    category: overrides.category ?? 'front',
    takenAt: overrides.takenAt ?? '2026-08-01',
    mimeType: overrides.mimeType ?? 'image/jpeg',
    width: overrides.width ?? 800,
    height: overrides.height ?? 600,
    sizeBytes: overrides.sizeBytes ?? 100,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    blob: overrides.blob ?? (new NodeBlob(['x']) as unknown as Blob),
    thumbnailBlob: overrides.thumbnailBlob ?? (new NodeBlob(['t']) as unknown as Blob),
  }
}

describe('resolveEntryPhotos', () => {
  it('resolves all present photos in order', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    await savePhoto(makePhotoRecord({ id: 'p1', entryId: entry.id }))
    await savePhoto(makePhotoRecord({ id: 'p2', entryId: entry.id }))
    const withPhotos = { ...entry, photoIds: ['p1', 'p2'] }

    const resolved = await resolveEntryPhotos(withPhotos)
    expect(resolved).toEqual([
      { id: 'p1', metadata: expect.objectContaining({ id: 'p1' }) },
      { id: 'p2', metadata: expect.objectContaining({ id: 'p2' }) },
    ])
  })

  it('returns metadata: null for a missing id instead of throwing', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    const withBroken = { ...entry, photoIds: ['missing-photo'] }

    const resolved = await resolveEntryPhotos(withBroken)
    expect(resolved).toEqual([{ id: 'missing-photo', metadata: null }])
  })

  it('treats undefined photoIds (pre-migration entries) as an empty list', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    expect(await resolveEntryPhotos(entry)).toEqual([])
  })

  it('dedupes repeated ids', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    await savePhoto(makePhotoRecord({ id: 'p1', entryId: entry.id }))
    const withDupes = { ...entry, photoIds: ['p1', 'p1'] }
    expect(await resolveEntryPhotos(withDupes)).toHaveLength(1)
  })
})

describe('linkPhotoToEntry / unlinkPhotoFromEntry', () => {
  it('links a photo id to an existing entry, deduped', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    expect(await linkPhotoToEntry(entry.id, 'p1')).toBe(true)
    expect(await linkPhotoToEntry(entry.id, 'p1')).toBe(true)
    expect(getBodyProgressEntryById(entry.id)?.photoIds).toEqual(['p1'])
  })

  it('returns false when linking to a non-existent entry', async () => {
    expect(await linkPhotoToEntry('missing', 'p1')).toBe(false)
  })

  it('unlinks a photo id, clearing photoIds back to undefined when empty', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    await linkPhotoToEntry(entry.id, 'p1')
    expect(await unlinkPhotoFromEntry(entry.id, 'p1')).toBe(true)
    expect(getBodyProgressEntryById(entry.id)?.photoIds).toBeUndefined()
  })
})

describe('deleteEntryAndPhotos', () => {
  it('cascades photo deletion when deletePhotos is true', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    await savePhoto(makePhotoRecord({ id: 'p1', entryId: entry.id }))
    await linkPhotoToEntry(entry.id, 'p1')

    const result = await deleteEntryAndPhotos(entry.id, true)
    expect(result).toEqual({ entryDeleted: true, photosDeleted: 1 })
    expect(getBodyProgressEntryById(entry.id)).toBeNull()
    expect((await getPhotoRecord('p1')).ok).toBe(false)
  })

  it('keeps photos as orphans when deletePhotos is false', async () => {
    const entry = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    await savePhoto(makePhotoRecord({ id: 'p1', entryId: entry.id }))
    await linkPhotoToEntry(entry.id, 'p1')

    const result = await deleteEntryAndPhotos(entry.id, false)
    expect(result).toEqual({ entryDeleted: true, photosDeleted: 0 })
    expect((await getPhotoRecord('p1')).ok).toBe(true)
  })

  it('returns entryDeleted: false for a non-existent entry', async () => {
    expect(await deleteEntryAndPhotos('missing', true)).toEqual({ entryDeleted: false, photosDeleted: 0 })
  })
})

describe('stripAllPhotoLinks', () => {
  it('removes photoIds from every entry without deleting the entries', async () => {
    const entryA = createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 }).entry!
    const entryB = createBodyProgressEntry({ recordedAt: '2026-08-02', weightKg: 81 }).entry!
    await linkPhotoToEntry(entryA.id, 'p1')
    await linkPhotoToEntry(entryB.id, 'p2')

    await stripAllPhotoLinks()

    expect(getBodyProgressEntries()).toHaveLength(2)
    expect(getBodyProgressEntryById(entryA.id)?.photoIds).toBeUndefined()
    expect(getBodyProgressEntryById(entryB.id)?.photoIds).toBeUndefined()
  })
})
