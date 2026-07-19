"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import {
  getTrainingPrograms,
  duplicateTrainingProgram,
  archiveTrainingProgram,
  restoreTrainingProgram,
  toggleTrainingProgramFavorite,
  deleteTrainingProgram,
  exportTrainingProgramMarkdown,
  type TrainingProgram,
} from "@/lib/training-programs"
import { ProgramEditorWizard } from "./ProgramEditorWizard"
import { ProgramInstantiationDialog } from "./ProgramInstantiationDialog"

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ProgramLibrary() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null)
  const [deletingProgram, setDeletingProgram] = useState<TrainingProgram | null>(null)
  const [instantiatingProgram, setInstantiatingProgram] = useState<TrainingProgram | null>(null)

  function reload() {
    setPrograms(getTrainingPrograms())
  }

  useEffect(reload, [])

  const filtered = useMemo(() => {
    let list = programs.filter((p) => (showArchived ? p.isArchived : !p.isArchived))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    if (showFavoritesOnly) list = list.filter((p) => p.isFavorite)
    return list
  }, [programs, search, showArchived, showFavoritesOnly])

  function handleDuplicate(id: string) {
    duplicateTrainingProgram(id)
    reload()
  }

  function handleArchiveToggle(program: TrainingProgram) {
    if (program.isArchived) restoreTrainingProgram(program.id)
    else archiveTrainingProgram(program.id)
    reload()
  }

  function handleFavorite(id: string) {
    toggleTrainingProgramFavorite(id)
    reload()
  }

  function confirmDelete() {
    if (!deletingProgram) return
    deleteTrainingProgram(deletingProgram.id, false)
    setDeletingProgram(null)
    reload()
  }

  function handleExport(program: TrainingProgram) {
    downloadMarkdown(`${program.name.replace(/\s+/g, "-").toLowerCase()}.md`, exportTrainingProgramMarkdown(program))
  }

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="section-header__title">Programas de treino</h1>
        <Link href="/treinos" className="btn btn--ghost">← Voltar</Link>
      </div>

      <div className="flex flex-wrap gap-2" style={{ marginBottom: "var(--space-4)" }}>
        <button type="button" className="btn btn--primary" onClick={() => { setEditingProgram(null); setShowEditor(true) }}>
          + Criar programa
        </button>
      </div>

      <div className="flex flex-wrap gap-2" style={{ marginBottom: "var(--space-4)" }}>
        <input
          className="input"
          style={{ flex: "1 1 200px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou descrição..."
          aria-label="Buscar programas"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showFavoritesOnly} onChange={(e) => setShowFavoritesOnly(e.target.checked)} />
          Favoritos
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Arquivados
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title={programs.length === 0 ? "Nenhum programa criado" : "Nenhum programa neste filtro"}
          description={
            programs.length === 0
              ? "Combine templates em semanas para montar um programa completo."
              : "Ajuste os filtros para ver outros programas."
          }
          action={
            programs.length === 0 ? (
              <button type="button" className="btn btn--primary" onClick={() => { setEditingProgram(null); setShowEditor(true) }}>
                Criar programa
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="workout-list">
          {filtered.map((program) => {
            const totalSessions = program.weeks.reduce((sum, w) => sum + w.sessions.length, 0)
            return (
              <article key={program.id} className="workout-row">
                <div className="workout-row__thumbnail" style={{ background: "var(--color-surface-raised)" }}>
                  <span aria-hidden="true">🗓️</span>
                </div>
                <div className="workout-row__info">
                  <div className="flex items-center gap-1.5">
                    {program.isFavorite && <span className="badge-pill badge-pill--accent">★ favorito</span>}
                    {program.isArchived && <span className="badge-pill badge-pill--level">arquivado</span>}
                    {program.version > 1 && <span className="badge-pill badge-pill--level">v{program.version}</span>}
                  </div>
                  <div className="workout-row__name">{program.name}</div>
                  <div className="workout-row__meta">
                    {program.weeks.length} semana{program.weeks.length !== 1 ? "s" : ""}
                    &nbsp;·&nbsp;{totalSessions} {totalSessions !== 1 ? "sessões" : "sessão"}
                  </div>
                </div>
                <div className="workout-row__actions">
                  <button className="workout-row__icon-btn" onClick={() => handleFavorite(program.id)} aria-label={`Favoritar ${program.name}`} title="Favoritar">
                    {program.isFavorite ? "★" : "☆"}
                  </button>
                  <button className="workout-row__icon-btn" onClick={() => handleExport(program)} aria-label={`Exportar ${program.name}`} title="Exportar Markdown">⬇️</button>
                  <button className="workout-row__icon-btn" onClick={() => handleDuplicate(program.id)} aria-label={`Duplicar ${program.name}`} title="Duplicar">⧉</button>
                  <button className="workout-row__icon-btn" onClick={() => { setEditingProgram(program); setShowEditor(true) }} aria-label={`Editar ${program.name}`} title="Editar">✏️</button>
                  <button className="workout-row__icon-btn" onClick={() => handleArchiveToggle(program)} aria-label={program.isArchived ? `Restaurar ${program.name}` : `Arquivar ${program.name}`} title={program.isArchived ? "Restaurar" : "Arquivar"}>
                    {program.isArchived ? "♻️" : "📦"}
                  </button>
                  <button className="workout-row__icon-btn" onClick={() => setDeletingProgram(program)} aria-label={`Excluir ${program.name}`} title="Excluir">🗑️</button>
                  <button className="workout-row__start-btn" onClick={() => setInstantiatingProgram(program)} aria-label={`Iniciar ${program.name}`}>
                    Iniciar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {showEditor && (
        <ProgramEditorWizard
          initial={editingProgram ?? undefined}
          onSaved={() => { setShowEditor(false); setEditingProgram(null); reload() }}
          onClose={() => { setShowEditor(false); setEditingProgram(null) }}
        />
      )}

      {deletingProgram && (
        <ConfirmDialog
          title="Excluir programa?"
          description={`"${deletingProgram.name}" será removido permanentemente. Sessões já instanciadas no Planner não são afetadas.`}
          confirmLabel="Excluir"
          isDanger
          onConfirm={confirmDelete}
          onCancel={() => setDeletingProgram(null)}
        />
      )}

      {instantiatingProgram && (
        <ProgramInstantiationDialog
          program={instantiatingProgram}
          onDone={() => setInstantiatingProgram(null)}
          onClose={() => setInstantiatingProgram(null)}
        />
      )}
    </div>
  )
}
