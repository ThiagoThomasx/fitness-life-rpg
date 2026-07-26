// Parser CSV genérico — Sprint 28 Parte 2. Nenhuma biblioteca de CSV está
// instalada no projeto (ver auditoria) e o formato exigido é simples o
// bastante para não justificar uma dependência nova. Suporta: BOM, CRLF/LF,
// campos entre aspas (com aspas escapadas `""`), delimitador `,` ou `;`
// (detectado pela primeira linha), e linhas em branco (ignoradas).

export interface ParsedCsv {
  header: string[]
  rows: string[][]
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function detectDelimiter(firstLine: string): ',' | ';' {
  const commaCount = (firstLine.match(/,/g) ?? []).length
  const semicolonCount = (firstLine.match(/;/g) ?? []).length
  return semicolonCount > commaCount ? ';' : ','
}

function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      fields.push(field)
      field = ''
    } else {
      field += char
    }
  }
  fields.push(field)
  return fields.map((f) => f.trim())
}

/**
 * Faz o parse de um texto CSV em cabeçalho + linhas. Linhas em branco são
 * descartadas antes do parse — não geram uma linha vazia no resultado.
 */
export function parseCsvText(text: string): ParsedCsv {
  const normalized = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)

  if (lines.length === 0) return { header: [], rows: [] }

  const delimiter = detectDelimiter(lines[0])
  const header = parseLine(lines[0], delimiter)
  const rows = lines.slice(1).map((line) => parseLine(line, delimiter))

  return { header, rows }
}
