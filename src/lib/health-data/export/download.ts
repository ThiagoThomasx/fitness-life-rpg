// Download helper — Sprint 30 Parte 3. Mesmo padrão de `backup.ts`/
// `body-wellness-export.ts`: Blob → object URL → clique programático →
// revoke imediato, sem deixar a URL viva.

export function downloadHealthExportFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
