"use client"

import type { HealthImportMapping } from "@/lib/health-data"

interface Props {
  suggestedPresets: HealthImportMapping[]
  appliedPresetId: string | null
  onApply: (preset: HealthImportMapping) => void
  onClearApplied: () => void
}

/** Sugestão de preset compatível — nunca aplicado sozinho (seções 15, 16, 20). */
export function HealthImportPresetBanner({ suggestedPresets, appliedPresetId, onApply, onClearApplied }: Props) {
  if (appliedPresetId) {
    const applied = suggestedPresets.find((p) => p.id === appliedPresetId)
    return (
      <div role="status" className="alert alert--success">
        ✓ Preset &quot;{applied?.name ?? appliedPresetId}&quot; aplicado. Revise o mapeamento abaixo antes de continuar.{" "}
        <button type="button" className="btn btn--ghost" style={{ marginLeft: 8 }} onClick={onClearApplied}>
          Remover
        </button>
      </div>
    )
  }

  if (suggestedPresets.length === 0) {
    return (
      <p className="settings-section__body" style={{ fontSize: "var(--text-xs)" }}>
        Nenhum preset compatível encontrado para este arquivo.
      </p>
    )
  }

  return (
    <div role="status" className="alert" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span>Preset(s) compatível(is) encontrado(s):</span>
      {suggestedPresets.map((preset) => (
        <div key={preset.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontWeight: 700 }}>{preset.name}</span>
          <button type="button" className="btn btn--secondary" onClick={() => onApply(preset)}>
            Aplicar
          </button>
        </div>
      ))}
    </div>
  )
}
