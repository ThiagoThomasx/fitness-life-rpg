"use client"

import { useId, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import { PhotoThumbnailImg } from "./PhotoThumbnailImg"

export type ComparableEntry = {
  id: string
  recordedAt: string
  photoIds: string[]
}

type PhotoComparisonModalProps = {
  /** Registros com ao menos uma foto, em ordem cronológica. */
  entries: ComparableEntry[]
  onClose: () => void
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

const selectLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500,
  display: "block", marginBottom: 6,
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
  border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)",
  color: "var(--color-text-primary)", fontSize: "var(--text-sm)",
}

/**
 * Comparação lado a lado (2 colunas no desktop, empilhado no mobile via
 * `.grid-2-col`) entre a primeira foto de dois registros escolhidos pelo
 * usuário. Sem alinhamento automático, sobreposição ou análise de diferença
 * — a interpretação é sempre visual e do próprio usuário.
 */
export function PhotoComparisonModal({ entries, onClose }: PhotoComparisonModalProps) {
  const titleId = useId()
  const [entryIdA, setEntryIdA] = useState(entries[0]?.id ?? "")
  const [entryIdB, setEntryIdB] = useState(entries[entries.length - 1]?.id ?? "")

  const entryA = entries.find((e) => e.id === entryIdA)
  const entryB = entries.find((e) => e.id === entryIdB)

  return (
    <ModalShell labelledBy={titleId} variant="sheet" onClose={onClose}>
      <h3 id={titleId} className="modal-title">Comparar fotos</h3>

      <div className="grid-2-col" style={{ marginTop: 12 }}>
        <div>
          <label style={selectLabelStyle}>Foto inicial</label>
          <select value={entryIdA} onChange={(e) => setEntryIdA(e.target.value)} style={selectStyle}>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>{formatDate(entry.recordedAt)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={selectLabelStyle}>Foto atual</label>
          <select value={entryIdB} onChange={(e) => setEntryIdB(e.target.value)} style={selectStyle}>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>{formatDate(entry.recordedAt)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2-col" style={{ marginTop: 16 }}>
        {[entryA, entryB].map((entry, index) => (
          <div key={entry?.id ?? index} style={{ textAlign: "center" }}>
            {entry?.photoIds[0] ? (
              <>
                <PhotoThumbnailImg
                  photoId={entry.photoIds[0]}
                  alt={`Foto registrada em ${formatDate(entry.recordedAt)}`}
                  size={200}
                  useFullBlob
                />
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 6 }}>
                  {formatDate(entry.recordedAt)}
                </p>
              </>
            ) : (
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Sem foto</p>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--ghost" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>
        Fechar
      </button>
    </ModalShell>
  )
}
