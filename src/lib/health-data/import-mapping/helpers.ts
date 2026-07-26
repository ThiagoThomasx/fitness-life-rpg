// Helpers puros de parsing — Sprint 30 Parte 1. Nunca adivinha silenciosamente:
// toda ambiguidade (data, decimal) retorna `null`/erro em vez de um palpite.

import type { HealthImportDateFormat, HealthImportDecimalSeparator } from './types'

// ─── Números (seção 14) ─────────────────────────────────────────────────────

/**
 * Faz o parse de um número textual dado o separador decimal explícito.
 * O separador de milhar (quando existir) é sempre o outro caractere — nunca
 * inferido a partir do formato do número.
 */
export function parseNumberWithSeparators(
  raw: string,
  decimalSeparator: HealthImportDecimalSeparator,
  thousandSeparator?: string
): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const thousand = thousandSeparator ?? (decimalSeparator === ',' ? '.' : ',')

  let normalized = trimmed
  if (thousand) {
    normalized = normalized.split(thousand).join('')
  }
  if (decimalSeparator !== '.') {
    normalized = normalized.replace(decimalSeparator, '.')
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

// ─── Datas (seção 12) ────────────────────────────────────────────────────────

interface DateParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

const DATE_FORMAT_PATTERNS: Record<HealthImportDateFormat, RegExp> = {
  ISO: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
  'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
  'DD/MM/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
  'MM/DD/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
  'DD-MM-YYYY': /^(\d{2})-(\d{2})-(\d{4})$/,
  'YYYY/MM/DD': /^(\d{4})\/(\d{2})\/(\d{2})$/,
  'DD/MM/YYYY HH:mm': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/,
  'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
}

function isValidDateParts(parts: DateParts): boolean {
  if (parts.month < 1 || parts.month > 12) return false
  if (parts.day < 1 || parts.day > 31) return false
  if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) return false
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second))
  return date.getUTCFullYear() === parts.year && date.getUTCMonth() === parts.month - 1 && date.getUTCDate() === parts.day
}

/**
 * Faz o parse de uma data textual em um formato explícito, retornando um
 * timestamp ISO (UTC). Retorna `null` para qualquer valor que não bata
 * exatamente com o formato ou que não seja uma data real (ex.: 31/02) —
 * nunca corrige ou adivinha.
 */
export function parseDateWithFormat(raw: string, format: HealthImportDateFormat, timezoneOffsetMinutes = 0): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  if (format === 'ISO') {
    const time = new Date(trimmed).getTime()
    return Number.isFinite(time) ? new Date(time).toISOString() : null
  }

  const match = DATE_FORMAT_PATTERNS[format].exec(trimmed)
  if (!match) return null

  let parts: DateParts
  if (format === 'YYYY-MM-DD') {
    const [, y, mo, d] = match
    parts = { year: Number(y), month: Number(mo), day: Number(d), hour: 0, minute: 0, second: 0 }
  } else if (format === 'YYYY/MM/DD') {
    const [, y, mo, d] = match
    parts = { year: Number(y), month: Number(mo), day: Number(d), hour: 0, minute: 0, second: 0 }
  } else if (format === 'DD/MM/YYYY' || format === 'DD-MM-YYYY') {
    const [, d, mo, y] = match
    parts = { year: Number(y), month: Number(mo), day: Number(d), hour: 0, minute: 0, second: 0 }
  } else if (format === 'MM/DD/YYYY') {
    const [, mo, d, y] = match
    parts = { year: Number(y), month: Number(mo), day: Number(d), hour: 0, minute: 0, second: 0 }
  } else if (format === 'DD/MM/YYYY HH:mm') {
    const [, d, mo, y, h, mi] = match
    parts = { year: Number(y), month: Number(mo), day: Number(d), hour: Number(h), minute: Number(mi), second: 0 }
  } else {
    const [, y, mo, d, h, mi, s] = match
    parts = { year: Number(y), month: Number(mo), day: Number(d), hour: Number(h), minute: Number(mi), second: Number(s) }
  }

  if (!isValidDateParts(parts)) return null

  const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return new Date(utcMs - timezoneOffsetMinutes * 60_000).toISOString()
}

/**
 * Uma data é ambígua entre `DD/MM/YYYY` e `MM/DD/YYYY` quando ambos os
 * primeiros dois grupos numéricos são `<= 12` — nesse caso o dia e o mês
 * podem ser trocados sem produzir um erro de parsing, então a UI precisa
 * exigir que o usuário escolha explicitamente (seção 12).
 */
export function isAmbiguousSlashDate(raw: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim())
  if (!match) return false
  const [, a, b] = match
  const first = Number(a)
  const second = Number(b)
  return first <= 12 && second <= 12 && first !== second
}

// ─── CSV Injection (seção 30) ────────────────────────────────────────────────

const DANGEROUS_LEADING_CHARS = ['=', '+', '-', '@', '\t', '\r']

/**
 * Neutraliza um valor textual que, se aberto em uma planilha, seria
 * interpretado como fórmula (Excel/Sheets/LibreOffice) — nunca aplicado a
 * campos numéricos (onde `-123` é um valor negativo legítimo, não uma
 * fórmula), apenas a campos de texto livre (metadata, externalId, source,
 * nomes de arquivo, observações).
 */
export function sanitizeCsvTextField(value: string): string {
  if (value.length === 0) return value
  if (DANGEROUS_LEADING_CHARS.includes(value[0])) {
    return `'${value}`
  }
  return value
}
