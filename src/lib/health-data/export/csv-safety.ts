// Segurança de CSV — Sprint 30 Parte 3. Dois cuidados distintos e
// independentes:
// 1) Escaping RFC-4180 correto (aspas, vírgula, ponto e vírgula, quebras de
//    linha, tabs) — nunca `array.join(",")` sem tratamento.
// 2) Neutralização de CSV/formula injection — reaproveita
//    `sanitizeCsvTextField` já existente em `import-mapping/helpers.ts`
//    (Sprint 30 Parte 1, seção 30) em vez de redefinir a mesma regra aqui.

import { sanitizeCsvTextField } from '../import-mapping/helpers'

export const neutralizeCsvFormula = sanitizeCsvTextField

/** Escapa aspas, delimitador e quebras de linha conforme RFC 4180. */
export function escapeCsvValue(value: string): string {
  if (/["\n\r,;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export interface CsvFieldOptions {
  /** Campo numérico: nunca passa por neutralização de fórmula. */
  numeric?: boolean
}

/** Serializa um único campo de uma linha CSV, tratando `undefined`/`null` como vazio. */
export function csvField(value: string | number | undefined | null, options: CsvFieldOptions = {}): string {
  if (value === undefined || value === null) return ''
  const str = String(value)
  if (options.numeric) return escapeCsvValue(str)
  return escapeCsvValue(neutralizeCsvFormula(str))
}

/** Monta uma linha CSV a partir de campos já classificados (numérico ou textual). */
export function csvRow(fields: { value: string | number | undefined | null; numeric?: boolean }[]): string {
  return fields.map((f) => csvField(f.value, { numeric: f.numeric })).join(',')
}
