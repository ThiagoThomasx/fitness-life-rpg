import { describe, expect, it } from 'vitest'
import { describePhotoDbError, describePhotoValidationError } from './body-progress-photo-errors'
import type { BodyPhotoValidationError } from './body-progress-photo'
import type { PhotoDbError } from './body-progress-photo-db'

describe('describePhotoValidationError', () => {
  const cases: BodyPhotoValidationError[] = [
    { type: 'invalid-mime', detail: 'image/gif' },
    { type: 'empty-file' },
    { type: 'too-large', maxBytes: 15 * 1024 * 1024, actualBytes: 20 * 1024 * 1024 },
    { type: 'invalid-dimensions', detail: 'width missing' },
    { type: 'max-per-entry-exceeded', max: 6 },
    { type: 'decode-failed' },
  ]

  it.each(cases)('returns a non-empty pt-BR message for %o', (error) => {
    const message = describePhotoValidationError(error)
    expect(message.length).toBeGreaterThan(0)
  })

  it('includes the max size in MB for too-large errors', () => {
    const message = describePhotoValidationError({ type: 'too-large', maxBytes: 15 * 1024 * 1024, actualBytes: 20 * 1024 * 1024 })
    expect(message).toContain('15 MB')
  })

  it('includes the max photo count for max-per-entry-exceeded errors', () => {
    const message = describePhotoValidationError({ type: 'max-per-entry-exceeded', max: 6 })
    expect(message).toContain('6')
  })

  it('never mentions image content, only the technical failure', () => {
    for (const error of cases) {
      expect(describePhotoValidationError(error)).not.toMatch(/gordura|corpo|peso aparente/i)
    }
  })
})

describe('describePhotoDbError', () => {
  const errors: PhotoDbError[] = ['indexeddb-unavailable', 'quota-exceeded', 'not-found', 'unknown']

  it.each(errors)('returns a non-empty pt-BR message for "%s"', (error) => {
    expect(describePhotoDbError(error).length).toBeGreaterThan(0)
  })

  it('falls back to a generic message when the error is undefined', () => {
    expect(describePhotoDbError(undefined).length).toBeGreaterThan(0)
  })

  it('distinguishes quota from unavailable storage', () => {
    expect(describePhotoDbError('quota-exceeded')).not.toBe(describePhotoDbError('indexeddb-unavailable'))
  })
})
