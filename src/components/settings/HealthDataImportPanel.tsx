"use client"

import { useRef, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import {
  parseHealthDataJsonImport,
  parseHealthDataCsvImport,
  buildHealthImportPreview,
  applyHealthImportRecords,
  MAX_HEALTH_IMPORT_FILE_BYTES,
  type HealthDataRecord,
  type HealthImportPreview,
  type HealthImportFileKind,
} from "@/lib/health-data"

const MAX_EXAMPLES = 20

function qualityBadgeClass(quality: HealthDataRecord["quality"]): string {
  if (quality === "high") return "health-quality-badge health-quality-badge--high"
  if (quality === "low") return "health-quality-badge health-quality-badge--low"
  return "health-quality-badge"
}

function formatRecord(record: HealthDataRecord): string {
  const date = new Date(record.recordedAt)
  const when = Number.isNaN(date.getTime()) ? record.recordedAt : date.toLocaleString("pt-BR")
  return `${record.metric} · ${record.value} ${record.unit} · ${when}`
}

type Props = {
  onImported: () => void
}

export function HealthDataImportPanel({ onImported }: Props) {
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<HealthImportPreview | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [showAllInvalid, setShowAllInvalid] = useState(false)
  const [showAllDuplicates, setShowAllDuplicates] = useState(false)

  async function handleFile(kind: HealthImportFileKind, file: File) {
    setMessage(null)
    setGlobalError(null)
    setPreview(null)
    setShowAllInvalid(false)
    setShowAllDuplicates(false)
    setFileName(file.name)

    if (file.size > MAX_HEALTH_IMPORT_FILE_BYTES) {
      const maxMb = (MAX_HEALTH_IMPORT_FILE_BYTES / (1024 * 1024)).toFixed(0)
      setGlobalError(`Arquivo maior que o limite de ${maxMb} MB.`)
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      setGlobalError("Não foi possível ler o arquivo.")
      return
    }

    const parsed = kind === "json" ? parseHealthDataJsonImport(text) : parseHealthDataCsvImport(text)
    if (!parsed.ok) {
      setGlobalError(parsed.globalError ?? "Falha ao interpretar o arquivo.")
      return
    }

    setPreview(buildHealthImportPreview(kind, parsed.items))
  }

  function handleInputChange(kind: HealthImportFileKind) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (file) handleFile(kind, file)
    }
  }

  function closePreview() {
    setPreview(null)
    setFileName(null)
    setGlobalError(null)
  }

  async function handleConfirm() {
    if (!preview || preview.readyToImport === 0) return
    setApplying(true)
    const result = applyHealthImportRecords(preview.validRecords)
    setApplying(false)
    closePreview()

    if (!result.ok) {
      setMessage({ type: "err", text: result.error ?? "Falha na importação. Nenhum dado foi alterado." })
      return
    }
    setMessage({ type: "ok", text: `${result.appliedCount} registro(s) importado(s) com sucesso.` })
    onImported()
  }

  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Importar dados de saúde</h3>
      <p className="settings-section__body">
        Importe registros de passos, sono, peso e outras métricas a partir de um arquivo JSON (formato canônico do app) ou CSV.
        Você vai revisar uma prévia antes de qualquer dado ser salvo.
      </p>

      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleInputChange("json")}
        aria-label="Selecionar arquivo JSON de dados de saúde"
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={handleInputChange("csv")}
        aria-label="Selecionar arquivo CSV de dados de saúde"
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={() => jsonInputRef.current?.click()}>
          📂 Importar JSON
        </button>
        <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={() => csvInputRef.current?.click()}>
          📄 Importar CSV
        </button>
      </div>

      {message && (
        <div role="alert" aria-live="polite" className={`alert ${message.type === "ok" ? "alert--success" : "alert--danger"}`} style={{ marginTop: 12 }}>
          {message.type === "ok" ? "✓ " : "✕ "}{message.text}
        </div>
      )}

      {globalError && !preview && (
        <div role="alert" aria-live="assertive" className="alert alert--danger" style={{ marginTop: 12 }}>
          ✕ {globalError}{fileName ? ` (${fileName})` : ""}
        </div>
      )}

      {preview && (
        <ModalShell
          labelledBy="health-import-preview-title"
          describedBy="health-import-preview-summary"
          variant="sheet"
          onClose={applying ? undefined : closePreview}
          dismissible={!applying}
        >
          <h3 id="health-import-preview-title" className="modal-title">Prévia da importação{fileName ? ` — ${fileName}` : ""}</h3>
          <p id="health-import-preview-summary" className="settings-section__body" style={{ marginTop: 8 }}>
            {preview.total} registro(s) encontrado(s) no arquivo.
          </p>

          <div className="health-import-counts" role="group" aria-label="Resumo da prévia">
            <div className="health-import-count">
              <span className="health-import-count__value">{preview.readyToImport}</span>
              <span className="health-import-count__label">prontos</span>
            </div>
            <div className="health-import-count">
              <span className="health-import-count__value">{preview.duplicates}</span>
              <span className="health-import-count__label">duplicados</span>
            </div>
            <div className="health-import-count">
              <span className="health-import-count__value">{preview.invalid}</span>
              <span className="health-import-count__label">inválidos</span>
            </div>
            <div className="health-import-count">
              <span className="health-import-count__value">{preview.qualityBreakdown.high}</span>
              <span className="health-import-count__label">qualidade alta</span>
            </div>
          </div>

          {preview.validRecords.length > 0 && (
            <>
              <p className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700, marginBottom: 4 }}>
                Prontos para importar
              </p>
              <ul className="health-import-list" aria-label="Registros prontos para importar">
                {preview.validRecords.slice(0, MAX_EXAMPLES).map((record) => (
                  <li key={record.id} className="health-import-list__row">
                    <span>{formatRecord(record)}</span>
                    <span className={qualityBadgeClass(record.quality)}>
                      {record.quality}
                    </span>
                  </li>
                ))}
              </ul>
              {preview.validRecords.length > MAX_EXAMPLES && (
                <p className="settings-section__body" style={{ fontSize: "var(--text-xs)" }}>
                  +{preview.validRecords.length - MAX_EXAMPLES} registro(s) não exibido(s) aqui, mas serão importados.
                </p>
              )}
            </>
          )}

          {preview.duplicateRecords.length > 0 && (
            <>
              <p className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700, marginTop: 12, marginBottom: 4 }}>
                Duplicados (não serão importados novamente)
              </p>
              <ul className="health-import-list" aria-label="Registros duplicados">
                {preview.duplicateRecords.slice(0, showAllDuplicates ? undefined : MAX_EXAMPLES).map((dup, i) => (
                  <li key={dup.record.id ?? i} className="health-import-list__row">
                    <span>{formatRecord(dup.record)}</span>
                    <span className="health-import-list__reason">{dup.reason}</span>
                  </li>
                ))}
              </ul>
              {preview.duplicateRecords.length > MAX_EXAMPLES && (
                <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => setShowAllDuplicates((v) => !v)}>
                  {showAllDuplicates ? "Mostrar menos" : `Mostrar todos (${preview.duplicateRecords.length})`}
                </button>
              )}
            </>
          )}

          {preview.invalidRecords.length > 0 && (
            <>
              <p className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700, marginTop: 12, marginBottom: 4 }}>
                Inválidos (não serão importados)
              </p>
              <ul className="health-import-list" aria-label="Registros inválidos">
                {preview.invalidRecords.slice(0, showAllInvalid ? undefined : MAX_EXAMPLES).map((err) => (
                  <li key={err.index} className="health-import-list__row">
                    <span>Linha/índice {err.index}</span>
                    <span className="health-import-list__reason">{err.reason}</span>
                  </li>
                ))}
              </ul>
              {preview.invalidRecords.length > MAX_EXAMPLES && (
                <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => setShowAllInvalid((v) => !v)}>
                  {showAllInvalid ? "Mostrar menos" : `Mostrar todos (${preview.invalidRecords.length})`}
                </button>
              )}
            </>
          )}

          <div className="settings-confirm__actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--secondary" onClick={closePreview} disabled={applying}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleConfirm}
              disabled={applying || preview.readyToImport === 0}
            >
              {applying ? "Importando…" : `Importar somente válidos (${preview.readyToImport})`}
            </button>
          </div>
        </ModalShell>
      )}
    </section>
  )
}
