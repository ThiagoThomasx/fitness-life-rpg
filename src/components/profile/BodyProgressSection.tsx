"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getBodyProgressEntries,
  createBodyProgressEntry,
  updateBodyProgressEntry,
  deleteBodyProgressEntry,
  type BodyProgressEntry,
  type NewBodyProgressInput,
} from "@/lib/body-progress"
import { summarizeWeightTrend } from "@/lib/body-progress-trends"
import { BodyProgressForm } from "./BodyProgressForm"
import { BodyProgressPhotoGallery } from "./BodyProgressPhotoGallery"
import { PhotoDetailModal } from "./PhotoDetailModal"
import { PhotoComparisonModal, type ComparableEntry } from "./PhotoComparisonModal"

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

export function BodyProgressSection() {
  const [entries, setEntries] = useState<BodyProgressEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<{ photoId: string; entryId: string } | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const load = useCallback(() => {
    setEntries(getBodyProgressEntries())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCreate(input: NewBodyProgressInput) {
    const result = createBodyProgressEntry(input)
    if (result.ok) {
      setShowForm(false)
      load()
    }
  }

  function handleUpdate(id: string, input: NewBodyProgressInput) {
    const updated = updateBodyProgressEntry(id, input)
    if (updated) {
      setEditingId(null)
      load()
    }
  }

  function handleDelete(id: string) {
    deleteBodyProgressEntry(id)
    setConfirmingDeleteId(null)
    load()
  }

  const editingEntry = editingId ? entries.find((e) => e.id === editingId) : undefined

  function handleCancelEdit() {
    // Fotos podem ter sido adicionadas/removidas durante a edição mesmo sem
    // "Salvar" — elas persistem direto (linkPhotoToEntry), então a lista
    // precisa recarregar para refletir isso mesmo ao cancelar.
    setEditingId(null)
    load()
  }

  if (editingEntry) {
    return (
      <BodyProgressForm
        initialEntry={editingEntry}
        onSubmit={(input) => handleUpdate(editingEntry.id, input)}
        onCancel={handleCancelEdit}
      />
    )
  }

  if (showForm) {
    return <BodyProgressForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
  }

  if (entries.length === 0) {
    return (
      <section className="card" style={{ textAlign: "center", padding: "2rem 1.25rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📏</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
          Acompanhe seu progresso corporal
        </h3>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
          Registre peso e medidas de forma opcional para ver tendências ao longo do tempo. Nenhum dado é
          enviado para fora deste navegador.
        </p>
        <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ width: "100%" }}>
          Adicionar registro
        </button>
      </section>
    )
  }

  const weightSummary = summarizeWeightTrend(entries)
  const first = entries[0]
  const latest = entries[entries.length - 1]
  const comparableEntries: ComparableEntry[] = entries
    .filter((e) => (e.photoIds?.length ?? 0) > 0)
    .map((e) => ({ id: e.id, recordedAt: e.recordedAt, photoIds: e.photoIds ?? [] }))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section className="card">
        <div className="stat-grid stat-grid--3">
          <div className="stat-cell">
            <div className="stat-cell__value numeric">
              {latest.weightKg !== undefined ? `${latest.weightKg.toFixed(1)} kg` : "—"}
            </div>
            <div className="stat-cell__label">Peso atual</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">
              {weightSummary.absoluteChange !== undefined
                ? `${weightSummary.absoluteChange > 0 ? "+" : ""}${weightSummary.absoluteChange.toFixed(1)} kg`
                : "—"}
            </div>
            <div className="stat-cell__label">Variação no período</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell__value numeric">{entries.length}</div>
            <div className="stat-cell__label">Registros</div>
          </div>
        </div>
        {first && latest && (
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 10 }}>
            Período acompanhado: {formatDate(first.recordedAt)} a {formatDate(latest.recordedAt)}
          </p>
        )}
      </section>

      <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ width: "100%" }}>
        + Novo registro
      </button>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 className="section-label">Histórico</h3>
          {comparableEntries.length >= 2 && (
            <button
              type="button"
              className="btn btn--ghost"
              style={{ fontSize: "0.7rem", padding: "4px 10px" }}
              onClick={() => setShowComparison(true)}
            >
              Comparar fotos
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {[...entries].reverse().map((entry) => (
            <div key={entry.id} className="card card--sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {formatDate(entry.recordedAt)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 4 }}>
                    {entry.weightKg !== undefined && <span>{entry.weightKg.toFixed(1)} kg</span>}
                    {entry.measurements && Object.keys(entry.measurements).length > 0 && (
                      <span>{entry.weightKg !== undefined ? " · " : ""}{Object.keys(entry.measurements).length} medida(s)</span>
                    )}
                  </div>
                  {entry.notes && (
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 4 }}>{entry.notes}</div>
                  )}
                  <BodyProgressPhotoGallery
                    photoIds={entry.photoIds ?? []}
                    onSelectPhoto={(photoId) => setSelectedPhoto({ photoId, entryId: entry.id })}
                  />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn--ghost"
                    style={{ fontSize: "0.7rem", padding: "4px 10px" }}
                    onClick={() => setEditingId(entry.id)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn--ghost"
                    style={{ fontSize: "0.7rem", padding: "4px 10px", color: "var(--color-danger)" }}
                    onClick={() => setConfirmingDeleteId(entry.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {confirmingDeleteId === entry.id && (
                <div style={{ marginTop: 10, padding: "0.625rem", borderRadius: 10, background: "var(--color-bg-subtle)" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: 8 }}>
                    Excluir este registro? Essa ação não pode ser desfeita.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn--primary"
                      style={{ flex: 1, fontSize: "0.75rem" }}
                      onClick={() => handleDelete(entry.id)}
                    >
                      Confirmar exclusão
                    </button>
                    <button
                      className="btn btn--ghost"
                      style={{ flex: 1, fontSize: "0.75rem" }}
                      onClick={() => setConfirmingDeleteId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {selectedPhoto && (
        <PhotoDetailModal
          photoId={selectedPhoto.photoId}
          entryId={selectedPhoto.entryId}
          onClose={() => setSelectedPhoto(null)}
          onChanged={load}
        />
      )}

      {showComparison && (
        <PhotoComparisonModal entries={comparableEntries} onClose={() => setShowComparison(false)} />
      )}
    </div>
  )
}
