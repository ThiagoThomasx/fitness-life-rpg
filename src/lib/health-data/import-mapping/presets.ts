// Persistência de presets — Sprint 30 Parte 1 (seções 18, 19, 21). Segue o
// mesmo padrão de `storage.ts`: array em uma única chave de `localStorage`.
// Nunca persiste conteúdo de arquivo — apenas a definição do mapeamento.

import type { HealthImportMapping, NewHealthImportMappingInput } from './types'

export const HEALTH_IMPORT_PRESETS_KEY = 'lrpg-fit:health-import-presets'

function isValidStoredMapping(raw: unknown): raw is HealthImportMapping {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    (r.sourceFormat === 'csv' || r.sourceFormat === 'json') &&
    typeof r.columns === 'object' &&
    typeof r.static === 'object' &&
    typeof r.decimalSeparator === 'string' &&
    typeof r.delimiter === 'string' &&
    Array.isArray(r.transformations) &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  )
}

export function loadHealthImportPresets(): HealthImportMapping[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HEALTH_IMPORT_PRESETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidStoredMapping)
  } catch {
    return []
  }
}

function persistPresets(presets: HealthImportMapping[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(HEALTH_IMPORT_PRESETS_KEY, JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}

function generatePresetId(): string {
  return `import-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface SavePresetResult {
  ok: boolean
  preset?: HealthImportMapping
  error?: string
}

export function createHealthImportPreset(input: NewHealthImportMappingInput): SavePresetResult {
  const now = new Date().toISOString()
  const preset: HealthImportMapping = { ...input, id: generatePresetId(), createdAt: now, updatedAt: now }
  const existing = loadHealthImportPresets()
  if (!persistPresets([...existing, preset])) {
    return { ok: false, error: 'Não foi possível salvar o preset (armazenamento indisponível).' }
  }
  return { ok: true, preset }
}

export function updateHealthImportPreset(id: string, input: NewHealthImportMappingInput): SavePresetResult {
  const existing = loadHealthImportPresets()
  const index = existing.findIndex((p) => p.id === id)
  if (index === -1) return { ok: false, error: 'Preset não encontrado.' }

  const updated: HealthImportMapping = { ...input, id, createdAt: existing[index].createdAt, updatedAt: new Date().toISOString() }
  const next = [...existing]
  next[index] = updated
  if (!persistPresets(next)) {
    return { ok: false, error: 'Não foi possível atualizar o preset (armazenamento indisponível).' }
  }
  return { ok: true, preset: updated }
}

export function duplicateHealthImportPreset(id: string, newName: string): SavePresetResult {
  const existing = loadHealthImportPresets()
  const source = existing.find((p) => p.id === id)
  if (!source) return { ok: false, error: 'Preset não encontrado.' }

  return createHealthImportPreset({
    name: newName,
    sourceFormat: source.sourceFormat,
    columns: source.columns,
    static: source.static,
    dateFormat: source.dateFormat,
    decimalSeparator: source.decimalSeparator,
    delimiter: source.delimiter,
    transformations: source.transformations,
  })
}

export function deleteHealthImportPreset(id: string): boolean {
  const existing = loadHealthImportPresets()
  const next = existing.filter((p) => p.id !== id)
  if (next.length === existing.length) return false
  return persistPresets(next)
}

export function getHealthImportPresetById(id: string): HealthImportMapping | null {
  return loadHealthImportPresets().find((p) => p.id === id) ?? null
}

/** Reset granular (seção 54) — apaga só os presets, nunca os registros de saúde importados por eles. */
export function resetHealthImportPresets(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(HEALTH_IMPORT_PRESETS_KEY)
}
