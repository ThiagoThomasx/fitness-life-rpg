"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  deleteHealthImportPreset,
  duplicateHealthImportPreset,
  loadHealthImportPresets,
  updateHealthImportPreset,
  type HealthImportMapping,
} from "@/lib/health-data"
import { hintStyle, inputStyle } from "./health-import-labels"

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("pt-BR")
}

/** Lista simples de presets salvos, com CRUD (seção 25). Aplicar um preset acontece dentro do wizard de mapeamento, contra um arquivo real — nunca aqui fora de contexto. */
export function HealthImportPresetsSection() {
  const [presets, setPresets] = useState<HealthImportMapping[]>([])
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState("")
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const deleteTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const load = useCallback(() => setPresets(loadHealthImportPresets()), [])

  useEffect(() => {
    load()
  }, [load])

  function showMessage(text: string) {
    setMessage(text)
    setTimeout(() => setMessage(null), 4000)
  }

  function startRename(preset: HealthImportMapping) {
    setRenamingId(preset.id)
    setRenameText(preset.name)
  }

  function confirmRename(preset: HealthImportMapping) {
    if (!renameText.trim()) return
    updateHealthImportPreset(preset.id, { ...preset, name: renameText.trim() })
    setRenamingId(null)
    load()
    showMessage("Preset renomeado.")
  }

  function handleDuplicate(preset: HealthImportMapping) {
    duplicateHealthImportPreset(preset.id, `Cópia de ${preset.name}`)
    load()
    showMessage("Preset duplicado.")
  }

  function returnFocusToTrigger(presetId: string) {
    deleteTriggerRefs.current.get(presetId)?.focus()
  }

  function handleDelete(preset: HealthImportMapping) {
    deleteHealthImportPreset(preset.id)
    setConfirmingDeleteId(null)
    load()
    showMessage("Preset excluído. Registros já importados não foram afetados.")
  }

  if (presets.length === 0) {
    return (
      <section className="card">
        <h3 className="section-label settings-section__title">Presets de importação</h3>
        <p className="settings-section__body">
          Nenhum preset salvo ainda. Presets são criados ao mapear um CSV não canônico, para reaproveitar o mesmo mapeamento depois.
        </p>
      </section>
    )
  }

  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Presets de importação</h3>
      <p className="settings-section__body">Mapeamentos salvos de importações anteriores.</p>

      {message && (
        <p role="status" aria-live="polite" style={{ ...hintStyle, color: "var(--color-accent)" }}>
          ✓ {message}
        </p>
      )}

      <ul className="health-import-list" aria-label="Presets salvos">
        {presets.map((preset) => (
          <li key={preset.id} className="card" style={{ padding: "0.625rem 0.75rem" }}>
            {renamingId === preset.id ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label={`Novo nome para ${preset.name}`}
                />
                <button type="button" className="btn btn--primary" onClick={() => confirmRename(preset)} disabled={!renameText.trim()}>
                  Salvar
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setRenamingId(null)}>Cancelar</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700 }}>{preset.name}</span>
                  <span style={{ ...hintStyle, marginTop: 0 }}>
                    {preset.sourceFormat.toUpperCase()} · atualizado em {formatUpdatedAt(preset.updatedAt)}
                  </span>
                </div>

                {confirmingDeleteId === preset.id ? (
                  <div role="group" aria-label={`Confirmar exclusão de ${preset.name}`} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: "var(--text-xs)", flex: 1 }}>Excluir este preset?</span>
                    <button type="button" className="btn btn--secondary" autoFocus onClick={() => handleDelete(preset)}>Confirmar exclusão</button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setConfirmingDeleteId(null)
                        returnFocusToTrigger(preset.id)
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn btn--ghost" onClick={() => startRename(preset)}>Renomear</button>
                    <button type="button" className="btn btn--ghost" onClick={() => handleDuplicate(preset)}>Duplicar</button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      ref={(el) => {
                        if (el) deleteTriggerRefs.current.set(preset.id, el)
                        else deleteTriggerRefs.current.delete(preset.id)
                      }}
                      onClick={() => setConfirmingDeleteId(preset.id)}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <p style={hintStyle}>Para usar um preset, selecione um CSV não canônico em &quot;Importar dados de saúde&quot; — presets compatíveis aparecem automaticamente.</p>
    </section>
  )
}
