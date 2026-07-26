// Motor de transformações — Sprint 30 Parte 1 (seções 16, 17). Cada função é
// pura e determinística; nenhuma delas executa código arbitrário. Aplicadas
// por `mapping.ts` sobre valores já extraídos de uma linha do arquivo.

import { parseDateWithFormat, parseNumberWithSeparators } from './helpers'
import type { HealthImportTransformation } from './types'

export interface TransformResult {
  value: string
  error?: string
}

function applyTextTransformation(raw: string, transformation: HealthImportTransformation): string | null {
  switch (transformation.kind) {
    case 'trim':
      return raw.trim()
    case 'lowercase':
      return raw.toLowerCase()
    case 'uppercase':
      return raw.toUpperCase()
    case 'replace':
      return raw.split(transformation.search).join(transformation.replacement)
    default:
      return null
  }
}

/**
 * Aplica uma única transformação a um valor textual bruto, retornando o
 * novo valor (sempre como string — números/datas viram string canônica
 * para manter a interface uniforme; quem consome decide o parse final) ou
 * um erro explicando por que não foi possível aplicar.
 */
export function applyTransformation(raw: string, transformation: HealthImportTransformation): TransformResult {
  const textResult = applyTextTransformation(raw, transformation)
  if (textResult !== null) return { value: textResult }

  switch (transformation.kind) {
    case 'parse_number': {
      const parsed = parseNumberWithSeparators(raw, transformation.decimalSeparator, transformation.thousandSeparator)
      if (parsed === null) return { value: raw, error: `Não foi possível interpretar "${raw}" como número.` }
      return { value: String(parsed) }
    }
    case 'parse_date': {
      const parsed = parseDateWithFormat(raw, transformation.format)
      if (parsed === null) return { value: raw, error: `Não foi possível interpretar "${raw}" como data no formato ${transformation.format}.` }
      return { value: parsed }
    }
    case 'unit_conversion': {
      const trimmed = raw.trim()
      return { value: trimmed.length > 0 ? trimmed : transformation.fromUnit }
    }
    case 'map_value': {
      const key = raw.trim()
      const mapped = transformation.valueMap[key]
      if (mapped === undefined) return { value: raw, error: `Valor "${raw}" não está no mapeamento de valores.` }
      return { value: String(mapped) }
    }
    case 'combine_date_time':
    case 'derive_sleep_duration':
      // Precisam de mais de uma coluna da linha — resolvidas em `mapping.ts`,
      // nunca aqui (esta função só conhece um valor por vez).
      return { value: raw, error: 'Transformação requer múltiplas colunas — aplicada pelo mecanismo de mapeamento.' }
    default:
      return { value: raw }
  }
}

/** Aplica uma cadeia de transformações em ordem, parando na primeira que falhar. */
export function applyTransformationChain(raw: string, transformations: HealthImportTransformation[]): TransformResult {
  let current = raw
  for (const transformation of transformations) {
    const result = applyTransformation(current, transformation)
    if (result.error) return result
    current = result.value
  }
  return { value: current }
}
