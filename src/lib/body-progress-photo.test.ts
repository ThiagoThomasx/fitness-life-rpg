import { describe, expect, it } from 'vitest'
import { BODY_PHOTO_CATEGORY_LABELS, DEFAULT_BODY_PHOTO_CONFIG, type BodyProgressPhotoCategory } from './body-progress-photo'

describe('BODY_PHOTO_CATEGORY_LABELS', () => {
  it('provides a pt-BR label for every photo category', () => {
    const categories: BodyProgressPhotoCategory[] = ['front', 'side', 'back', 'other']
    for (const category of categories) {
      expect(BODY_PHOTO_CATEGORY_LABELS[category]).toEqual(expect.any(String))
      expect(BODY_PHOTO_CATEGORY_LABELS[category].length).toBeGreaterThan(0)
    }
  })
})

describe('DEFAULT_BODY_PHOTO_CONFIG', () => {
  it('accepts only jpeg, png and webp', () => {
    expect(DEFAULT_BODY_PHOTO_CONFIG.acceptedMimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })

  it('has sane positive limits', () => {
    expect(DEFAULT_BODY_PHOTO_CONFIG.maxOriginalBytes).toBeGreaterThan(0)
    expect(DEFAULT_BODY_PHOTO_CONFIG.maxDimensionPx).toBeGreaterThan(0)
    expect(DEFAULT_BODY_PHOTO_CONFIG.thumbnailDimensionPx).toBeGreaterThan(0)
    expect(DEFAULT_BODY_PHOTO_CONFIG.maxPhotosPerEntry).toBeGreaterThan(0)
  })

  it('keeps jpeg quality within the valid 0..1 range', () => {
    expect(DEFAULT_BODY_PHOTO_CONFIG.jpegQuality).toBeGreaterThan(0)
    expect(DEFAULT_BODY_PHOTO_CONFIG.jpegQuality).toBeLessThanOrEqual(1)
  })

  it('caps thumbnails smaller than the main image dimension', () => {
    expect(DEFAULT_BODY_PHOTO_CONFIG.thumbnailDimensionPx).toBeLessThan(DEFAULT_BODY_PHOTO_CONFIG.maxDimensionPx)
  })
})
