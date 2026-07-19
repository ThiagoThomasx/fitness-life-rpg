// Processamento de imagem via Canvas API nativa — Sprint 19 Parte 2.
// Sem dependência externa de compressão/imagem: decodificação, redimensiona-
// mento e geração de miniatura usam apenas `createImageBitmap`/`<canvas>`.
// Nenhum filtro, retoque, alinhamento ou análise corporal é aplicado aqui —
// apenas redimensionamento proporcional e recompressão.

import {
  DEFAULT_BODY_PHOTO_CONFIG,
  type BodyPhotoConfig,
  type BodyPhotoValidationError,
  type BodyProgressPhotoMimeType,
} from './body-progress-photo'
import { validateDecodedDimensions } from './body-progress-photo-validation'

export interface ProcessedPhoto {
  blob: Blob
  thumbnailBlob: Blob
  width: number
  height: number
  mimeType: BodyProgressPhotoMimeType
}

export type ProcessPhotoResult =
  | { ok: true; value: ProcessedPhoto }
  | { ok: false; error: BodyPhotoValidationError }

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  close?: () => void
}

async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // Fallback abaixo — alguns navegadores/tipos de arquivo não suportam createImageBitmap.
    }
  }
  return decodeImageViaElement(file)
}

function decodeImageViaElement(file: File): Promise<DecodedImage | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** Calcula dimensões proporcionais sem nunca ampliar uma imagem já pequena. */
export function computeResizedDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number
): { width: number; height: number } {
  const longestSide = Math.max(sourceWidth, sourceHeight)
  if (longestSide <= maxDimension) {
    return { width: sourceWidth, height: sourceHeight }
  }
  const scale = maxDimension / longestSide
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

/** PNG só é preservado se o arquivo original já era PNG; todo o resto normaliza para JPEG. */
function resolveOutputMimeType(inputMimeType: string): BodyProgressPhotoMimeType {
  return inputMimeType === 'image/png' ? 'image/png' : 'image/jpeg'
}

async function renderVariant(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  mimeType: BodyProgressPhotoMimeType,
  quality: number
): Promise<{ blob: Blob; width: number; height: number } | null> {
  const { width, height } = computeResizedDimensions(sourceWidth, sourceHeight, maxDimension)
  const canvas = drawToCanvas(source, width, height)
  const blob = await canvasToBlob(canvas, mimeType, quality)
  if (!blob) return null
  return { blob, width, height }
}

export async function processPhotoFile(
  file: File,
  config: BodyPhotoConfig = DEFAULT_BODY_PHOTO_CONFIG
): Promise<ProcessPhotoResult> {
  const decoded = await decodeImage(file)
  if (!decoded) return { ok: false, error: { type: 'decode-failed' } }

  try {
    const dimensionsError = validateDecodedDimensions(decoded.width, decoded.height)
    if (dimensionsError) return { ok: false, error: dimensionsError }

    const mimeType = resolveOutputMimeType(file.type)
    const main = await renderVariant(
      decoded.source,
      decoded.width,
      decoded.height,
      config.maxDimensionPx,
      mimeType,
      config.jpegQuality
    )
    if (!main) return { ok: false, error: { type: 'decode-failed' } }

    const thumbnail = await renderVariant(
      decoded.source,
      decoded.width,
      decoded.height,
      config.thumbnailDimensionPx,
      mimeType,
      config.jpegQuality
    )
    if (!thumbnail) return { ok: false, error: { type: 'decode-failed' } }

    return {
      ok: true,
      value: {
        blob: main.blob,
        thumbnailBlob: thumbnail.blob,
        width: main.width,
        height: main.height,
        mimeType,
      },
    }
  } finally {
    decoded.close?.()
  }
}
