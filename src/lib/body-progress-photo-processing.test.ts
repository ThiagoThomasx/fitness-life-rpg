import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeResizedDimensions, processPhotoFile } from './body-progress-photo-processing'

describe('computeResizedDimensions', () => {
  it('leaves an already-small image unchanged', () => {
    expect(computeResizedDimensions(400, 300, 1600)).toEqual({ width: 400, height: 300 })
  })

  it('never upscales', () => {
    expect(computeResizedDimensions(100, 50, 1600)).toEqual({ width: 100, height: 50 })
  })

  it('scales an oversized landscape image down, preserving aspect ratio', () => {
    expect(computeResizedDimensions(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 })
  })

  it('scales an oversized portrait image down, preserving aspect ratio', () => {
    expect(computeResizedDimensions(2000, 4000, 1600)).toEqual({ width: 800, height: 1600 })
  })

  it('handles the exact-boundary case without scaling', () => {
    expect(computeResizedDimensions(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })
})

describe('processPhotoFile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function stubCanvasRendering() {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string
    ) {
      callback(new Blob(['x'], { type: type ?? 'image/jpeg' }))
    })
  }

  it('processes a valid jpeg happy path, producing a resized main image and a thumbnail', async () => {
    stubCanvasRendering()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4000, height: 2000, close: vi.fn() }))
    )

    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await processPhotoFile(file)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.width).toBe(1600)
    expect(result.value.height).toBe(800)
    expect(result.value.mimeType).toBe('image/jpeg')
    expect(result.value.blob).toBeInstanceOf(Blob)
    expect(result.value.thumbnailBlob).toBeInstanceOf(Blob)
  })

  it('preserves png output only when the input was png', async () => {
    stubCanvasRendering()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() }))
    )

    const file = new File([new Uint8Array(10)], 'photo.png', { type: 'image/png' })
    const result = await processPhotoFile(file)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.mimeType).toBe('image/png')
  })

  it('normalizes a non-jpeg/png-recognized source to jpeg output', async () => {
    stubCanvasRendering()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() }))
    )

    const file = new File([new Uint8Array(10)], 'photo.webp', { type: 'image/webp' })
    const result = await processPhotoFile(file)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.mimeType).toBe('image/jpeg')
  })

  it('returns decode-failed when createImageBitmap and the <img> fallback both fail', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('unsupported')
      })
    )
    const originalImage = global.Image
    class FailingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    // @ts-expect-error simulating a browser where image decoding fails
    global.Image = FailingImage

    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await processPhotoFile(file)

    expect(result).toEqual({ ok: false, error: { type: 'decode-failed' } })
    global.Image = originalImage
  })

  it('rejects a decoded image with invalid (zero) dimensions', async () => {
    stubCanvasRendering()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 0, height: 0, close: vi.fn() }))
    )

    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await processPhotoFile(file)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('invalid-dimensions')
  })
})
