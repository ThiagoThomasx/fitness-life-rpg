"use client"

import { useRef } from "react"

type Props = {
  isConfirming: boolean
  fileName: string | null
  onFileSelected: (file: File) => void
  onConfirm: () => void
  onCancel: () => void
}

export function BackupImportSection({ isConfirming, fileName, onFileSelected, onConfirm, onCancel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = ""
  }

  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Importar backup</h3>
      <p className="settings-section__body">
        Restaura dados a partir de um arquivo de backup exportado por este app. Os dados atuais serão substituídos.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleChange}
        aria-label="Selecionar arquivo de backup"
      />
      <button
        type="button"
        className="btn btn--secondary btn--full"
        onClick={() => fileInputRef.current?.click()}
      >
        📂 Selecionar arquivo .json
      </button>

      {isConfirming && fileName && (
        <div role="alertdialog" aria-label="Confirmar importação" className="settings-confirm settings-confirm--warning">
          <p className="settings-confirm__title">⚠️ Confirmar importação</p>
          <p className="settings-confirm__body">
            O arquivo <strong>{fileName}</strong> vai substituir os dados locais atuais. Essa ação não pode ser desfeita.
          </p>
          <div className="settings-confirm__actions">
            <button type="button" className="btn btn--primary" onClick={onConfirm}>
              Confirmar
            </button>
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
