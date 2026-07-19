import { describe, it, expect } from 'vitest'
import { validatePhotoFile, validateDecodedDimensions } from './body-progress-photo-validation'
import { DEFAULT_BODY_PHOTO_CONFIG } from './body-progress-photo'

function makeFile(bytes: number, type: string, name = 'photo.jpg'): File {
  const content = bytes > 0 ? new Uint8Array(bytes) : new Uint8Array(0)
  return new File([content], name, { type })
}

describe('validatePhotoFile', () => {
  it('accepts a valid jpeg within limits', () => {
    const file = makeFile(1024, 'image/jpeg')
    expect(validatePhotoFile(file, 0)).toBeNull()
  })

  it('rejects an empty file', () => {
    const file = makeFile(0, 'image/jpeg')
    expect(validatePhotoFile(file, 0)).toEqual({ type: 'empty-file' })
  })

  it('rejects an unsupported mime type', () => {
    const file = makeFile(1024, 'image/gif')
    expect(validatePhotoFile(file, 0)).toEqual({ type: 'invalid-mime', detail: 'image/gif' })
  })

  it('rejects a file larger than maxOriginalBytes', () => {
    const file = makeFile(DEFAULT_BODY_PHOTO_CONFIG.maxOriginalBytes + 1, 'image/jpeg')
    expect(validatePhotoFile(file, 0)).toEqual({
      type: 'too-large',
      maxBytes: DEFAULT_BODY_PHOTO_CONFIG.maxOriginalBytes,
      actualBytes: DEFAULT_BODY_PHOTO_CONFIG.maxOriginalBytes + 1,
    })
  })

  it('rejects when the entry already has the maximum number of photos', () => {
    const file = makeFile(1024, 'image/jpeg')
    expect(validatePhotoFile(file, DEFAULT_BODY_PHOTO_CONFIG.maxPhotosPerEntry)).toEqual({
      type: 'max-per-entry-exceeded',
      max: DEFAULT_BODY_PHOTO_CONFIG.maxPhotosPerEntry,
    })
  })

  it('respects a custom config', () => {
    const file = makeFile(2048, 'image/webp')
    const customConfig = { ...DEFAULT_BODY_PHOTO_CONFIG, maxOriginalBytes: 1024 }
    expect(validatePhotoFile(file, 0, customConfig)).toEqual({
      type: 'too-large',
      maxBytes: 1024,
      actualBytes: 2048,
    })
  })
})

describe('validateDecodedDimensions', () => {
  it('accepts positive dimensions', () => {
    expect(validateDecodedDimensions(800, 600)).toBeNull()
  })

  it('rejects zero width', () => {
    expect(validateDecodedDimensions(0, 600)).toEqual({ type: 'invalid-dimensions', detail: '0x600' })
  })

  it('rejects zero height', () => {
    expect(validateDecodedDimensions(800, 0)).toEqual({ type: 'invalid-dimensions', detail: '800x0' })
  })

  it('rejects non-finite dimensions', () => {
    expect(validateDecodedDimensions(NaN, 600)).not.toBeNull()
  })
})
