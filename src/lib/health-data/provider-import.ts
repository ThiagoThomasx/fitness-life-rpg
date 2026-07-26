// Ponte Provider → Pipeline — Sprint 29 Parte 1. Único caminho permitido para
// um `HealthDataProvider` alimentar o domínio `health-data`: os registros
// lidos do provider são tratados exatamente como um arquivo importado — vão
// para `buildHealthImportPreview` (validação, normalização, qualidade,
// deduplicação) e só então, se aplicados, para `applyHealthImportRecords`
// (persistência atômica). Nenhum atalho direto para storage.

import { applyHealthImportRecords } from './import-apply'
import { buildHealthImportPreview } from './import-preview'
import type { HealthDataProvider, HealthProviderQuery } from './provider'
import type { HealthImportPreview } from './types'
import type { ParsedImportItem } from './import-json'

export interface ProviderImportResult {
  ok: boolean
  preview?: HealthImportPreview
  appliedCount: number
  error?: string
}

/**
 * Lê registros de um provider e os leva através da mesma pipeline usada por
 * importação de arquivo. Retorna a prévia (para transparência de qualidade/
 * duplicidade) e o resultado da aplicação. Nunca escreve diretamente em
 * storage sem passar pela prévia.
 */
export async function importFromProvider(
  provider: HealthDataProvider,
  query: HealthProviderQuery
): Promise<ProviderImportResult> {
  const available = await provider.isAvailable()
  if (!available) {
    return { ok: false, appliedCount: 0, error: `Provider "${provider.name}" não está disponível neste ambiente.` }
  }

  const readResult = await provider.readRecords(query)
  if (!readResult.ok) {
    return { ok: false, appliedCount: 0, error: readResult.error ?? 'Falha ao ler dados do provider.' }
  }

  const items: ParsedImportItem[] = readResult.records.map((input, index) => ({ index, input }))
  const preview = buildHealthImportPreview('json', items)

  if (preview.readyToImport === 0) {
    return { ok: true, preview, appliedCount: 0 }
  }

  const applyResult = applyHealthImportRecords(preview.validRecords)
  if (!applyResult.ok) {
    return { ok: false, preview, appliedCount: 0, error: applyResult.error }
  }

  return { ok: true, preview, appliedCount: applyResult.appliedCount }
}
