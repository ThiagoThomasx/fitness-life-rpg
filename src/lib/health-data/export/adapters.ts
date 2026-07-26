// Format adapters — Sprint 30 Parte 3 (seções 20-24). Consolida, atrás de
// uma interface única, as três formas de entrada já existentes
// (JSON canônico, CSV canônico, CSV mapeado) — nenhuma reimplementa parsing:
// cada adapter só chama o parser já existente e testado da Parte 1/2. Nenhum
// adapter importa sozinho; só decide/parseia. Nenhum adapter de marca
// específica (Apple Health, Google Fit etc.) — fora de escopo.

import { parseCsvText } from '../csv-parser'
import { inspectCsvHeader } from '../import-mapping/inspection'
import { parseHealthDataCsvImport } from '../import-csv'
import { parseHealthDataJsonImport } from '../import-json'
import { applyMappingToCsv } from '../import-mapping/mapping'
import type { HealthImportMapping } from '../import-mapping/types'
import type { ParsedImportItem } from '../import-json'

export interface HealthImportInput {
  name: string
  text: string
}

export interface HealthImportAdapterOptions {
  /** Exigido apenas pelo adapter `mapped-csv`. */
  mapping?: HealthImportMapping
}

export interface HealthFileInspection {
  kind: 'json' | 'csv'
  /** `true` quando o arquivo já é compatível com o parser canônico e pode pular o mapeamento. */
  isCanonical: boolean
  header?: string[]
}

export interface HealthImportFormatAdapter {
  id: string
  name: string
  canHandle(input: HealthImportInput): boolean
  inspect(input: HealthImportInput): Promise<HealthFileInspection>
  parse(input: HealthImportInput, options?: HealthImportAdapterOptions): Promise<ParsedImportItem[]>
}

function looksLikeJsonObject(text: string): boolean {
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

/** JSON canônico `{ version, records }` — sempre pula mapeamento (seção 22). */
export const canonicalJsonAdapter: HealthImportFormatAdapter = {
  id: 'canonical-json',
  name: 'JSON canônico',
  canHandle: (input) => looksLikeJsonObject(input.text),
  inspect: async () => ({ kind: 'json', isCanonical: true }),
  parse: async (input) => {
    const parsed = parseHealthDataJsonImport(input.text)
    if (!parsed.ok) throw new Error(parsed.globalError ?? 'Falha ao interpretar o arquivo JSON.')
    return parsed.items
  },
}

/** CSV cujo cabeçalho já resolve 100% para as colunas canônicas — pula mapeamento (seção 23). */
export const canonicalCsvAdapter: HealthImportFormatAdapter = {
  id: 'canonical-csv',
  name: 'CSV canônico',
  canHandle: (input) => {
    const { header } = parseCsvText(input.text)
    return header.length > 0 && inspectCsvHeader(header).isCanonical
  },
  inspect: async (input) => {
    const { header } = parseCsvText(input.text)
    return { kind: 'csv', isCanonical: true, header }
  },
  parse: async (input) => {
    const parsed = parseHealthDataCsvImport(input.text)
    if (!parsed.ok) throw new Error(parsed.globalError ?? 'Falha ao interpretar o arquivo CSV.')
    return parsed.items
  },
}

/** CSV não canônico — exige um `HealthImportMapping` explícito (obtido via wizard), nunca infere sozinho (seção 24). */
export const mappedCsvAdapter: HealthImportFormatAdapter = {
  id: 'mapped-csv',
  name: 'CSV mapeado',
  canHandle: (input) => {
    const { header } = parseCsvText(input.text)
    return header.length > 0
  },
  inspect: async (input) => {
    const { header } = parseCsvText(input.text)
    return { kind: 'csv', isCanonical: false, header }
  },
  parse: async (input, options) => {
    if (!options?.mapping) {
      throw new Error('CSV não canônico requer um mapeamento (use o wizard de mapeamento).')
    }
    const { header, rows } = parseCsvText(input.text)
    const result = applyMappingToCsv(options.mapping, header, rows)
    if (!result.ok) throw new Error(result.globalError ?? 'Mapeamento inválido.')
    return result.items
  },
}

/** Ordem de detecção: canonical-json → canonical-csv → mapped-csv (seção 24). */
export const HEALTH_IMPORT_FORMAT_ADAPTERS: readonly HealthImportFormatAdapter[] = [
  canonicalJsonAdapter,
  canonicalCsvAdapter,
  mappedCsvAdapter,
]

/** Escolhe o primeiro adapter compatível, na ordem de detecção — nunca importa, só decide o caminho de parsing. */
export function detectHealthImportAdapter(input: HealthImportInput): HealthImportFormatAdapter | null {
  return HEALTH_IMPORT_FORMAT_ADAPTERS.find((adapter) => adapter.canHandle(input)) ?? null
}
