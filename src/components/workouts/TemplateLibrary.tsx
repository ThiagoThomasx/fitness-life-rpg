"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import {
  getWorkoutTemplates,
  duplicateWorkoutTemplate,
  archiveWorkoutTemplate,
  restoreWorkoutTemplate,
  toggleWorkoutTemplateFavorite,
  deleteWorkoutTemplate,
  exportWorkoutTemplateMarkdown,
  WORKOUT_TEMPLATE_OBJECTIVE_LABELS,
  WORKOUT_TEMPLATE_DIFFICULTY_LABELS,
  type WorkoutTemplate,
  type WorkoutTemplateObjective,
  type WorkoutTemplateDifficulty,
} from "@/lib/workout-templates"
import { isTemplateUsedInPrograms } from "@/lib/training-programs"
import { TemplateEditorModal } from "./TemplateEditorModal"

type SortOption = "updated" | "name" | "duration" | "exercises" | "favorites"

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function TemplateLibrary() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [search, setSearch] = useState("")
  const [objectiveFilter, setObjectiveFilter] = useState<WorkoutTemplateObjective | "">("")
  const [difficultyFilter, setDifficultyFilter] = useState<WorkoutTemplateDifficulty | "">("")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [sort, setSort] = useState<SortOption>("updated")
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<WorkoutTemplate | null>(null)

  function reload() {
    setTemplates(getWorkoutTemplates())
  }

  useEffect(reload, [])

  const filtered = useMemo(() => {
    let list = templates.filter((t) => (showArchived ? t.isArchived : !t.isArchived))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          t.exerciseBlocks.some((b) => b.exercise.exerciseName.toLowerCase().includes(q))
      )
    }
    if (objectiveFilter) list = list.filter((t) => t.objective === objectiveFilter)
    if (difficultyFilter) list = list.filter((t) => t.difficulty === difficultyFilter)
    if (showFavoritesOnly) list = list.filter((t) => t.isFavorite)

    const sorted = [...list]
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "duration":
        sorted.sort((a, b) => (a.estimatedDurationMinutes ?? 0) - (b.estimatedDurationMinutes ?? 0))
        break
      case "exercises":
        sorted.sort((a, b) => b.exerciseBlocks.length - a.exerciseBlocks.length)
        break
      case "favorites":
        sorted.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
        break
      default:
        sorted.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
    }
    return sorted
  }, [templates, search, objectiveFilter, difficultyFilter, showFavoritesOnly, showArchived, sort])

  function handleDuplicate(id: string) {
    duplicateWorkoutTemplate(id)
    reload()
  }

  function handleArchiveToggle(template: WorkoutTemplate) {
    if (template.isArchived) restoreWorkoutTemplate(template.id)
    else archiveWorkoutTemplate(template.id)
    reload()
  }

  function handleFavorite(id: string) {
    toggleWorkoutTemplateFavorite(id)
    reload()
  }

  function confirmDelete() {
    if (!deletingTemplate) return
    deleteWorkoutTemplate(deletingTemplate.id, isTemplateUsedInPrograms(deletingTemplate.id))
    setDeletingTemplate(null)
    reload()
  }

  function handleExport(template: WorkoutTemplate) {
    downloadMarkdown(`${template.name.replace(/\s+/g, "-").toLowerCase()}.md`, exportWorkoutTemplateMarkdown(template))
  }

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="section-header__title">Templates de treino</h1>
        <Link href="/treinos" className="btn btn--ghost">← Voltar</Link>
      </div>

      <div className="flex flex-wrap gap-2" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => { setEditingTemplate(null); setShowEditor(true) }}
        >
          + Criar template
        </button>
      </div>

      <div className="flex flex-wrap gap-2" style={{ marginBottom: "var(--space-4)" }}>
        <input
          className="input"
          style={{ flex: "1 1 200px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, tag ou exercício..."
          aria-label="Buscar templates"
        />
        <select className="select" value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value as WorkoutTemplateObjective | "")} aria-label="Filtrar por objetivo">
          <option value="">Todos os objetivos</option>
          {Object.entries(WORKOUT_TEMPLATE_OBJECTIVE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className="select" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value as WorkoutTemplateDifficulty | "")} aria-label="Filtrar por dificuldade">
          <option value="">Todas as dificuldades</option>
          {Object.entries(WORKOUT_TEMPLATE_DIFFICULTY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)} aria-label="Ordenar por">
          <option value="updated">Atualizados recentemente</option>
          <option value="name">Nome</option>
          <option value="duration">Duração</option>
          <option value="exercises">Nº de exercícios</option>
          <option value="favorites">Favoritos primeiro</option>
        </select>
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
          icon="📋"
          title={templates.length === 0 ? "Nenhum template criado" : "Nenhum template neste filtro"}
          description={
            templates.length === 0
              ? "Crie uma estrutura reutilizável para montar treinos e programas mais rapidamente."
              : "Ajuste os filtros para ver outros templates."
          }
          action={
            templates.length === 0 ? (
              <button type="button" className="btn btn--primary" onClick={() => { setEditingTemplate(null); setShowEditor(true) }}>
                Criar template
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="workout-list">
          {filtered.map((template) => (
            <article key={template.id} className="workout-row">
              <div className="workout-row__thumbnail" style={{ background: "var(--color-surface-raised)" }}>
                <span aria-hidden="true">📋</span>
              </div>
              <div className="workout-row__info">
                <div className="flex items-center gap-1.5">
                  {template.objective && (
                    <span className="workout-row__category">{WORKOUT_TEMPLATE_OBJECTIVE_LABELS[template.objective]}</span>
                  )}
                  {template.isFavorite && <span className="badge-pill badge-pill--accent">★ favorito</span>}
                  {template.isArchived && <span className="badge-pill badge-pill--level">arquivado</span>}
                  {template.version > 1 && <span className="badge-pill badge-pill--level">v{template.version}</span>}
                </div>
                <div className="workout-row__name">{template.name}</div>
                <div className="workout-row__meta">
                  {template.exerciseBlocks.length} exercício{template.exerciseBlocks.length !== 1 ? "s" : ""}
                  {template.estimatedDurationMinutes && <>&nbsp;·&nbsp;~{template.estimatedDurationMinutes}min</>}
                  {template.difficulty && <>&nbsp;·&nbsp;{WORKOUT_TEMPLATE_DIFFICULTY_LABELS[template.difficulty]}</>}
                </div>
              </div>
              <div className="workout-row__actions">
                <button className="workout-row__icon-btn" onClick={() => handleFavorite(template.id)} aria-label={`Favoritar ${template.name}`} title="Favoritar">
                  {template.isFavorite ? "★" : "☆"}
                </button>
                <button className="workout-row__icon-btn" onClick={() => handleExport(template)} aria-label={`Exportar ${template.name}`} title="Exportar Markdown">⬇️</button>
                <button className="workout-row__icon-btn" onClick={() => handleDuplicate(template.id)} aria-label={`Duplicar ${template.name}`} title="Duplicar">⧉</button>
                <button className="workout-row__icon-btn" onClick={() => { setEditingTemplate(template); setShowEditor(true) }} aria-label={`Editar ${template.name}`} title="Editar">✏️</button>
                <button className="workout-row__icon-btn" onClick={() => handleArchiveToggle(template)} aria-label={template.isArchived ? `Restaurar ${template.name}` : `Arquivar ${template.name}`} title={template.isArchived ? "Restaurar" : "Arquivar"}>
                  {template.isArchived ? "♻️" : "📦"}
                </button>
                <button className="workout-row__icon-btn" onClick={() => setDeletingTemplate(template)} aria-label={`Excluir ${template.name}`} title="Excluir">🗑️</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showEditor && (
        <TemplateEditorModal
          initial={editingTemplate ?? undefined}
          onSaved={() => { setShowEditor(false); setEditingTemplate(null); reload() }}
          onClose={() => { setShowEditor(false); setEditingTemplate(null) }}
        />
      )}

      {deletingTemplate && (
        isTemplateUsedInPrograms(deletingTemplate.id) ? (
          <ConfirmDialog
            title="Este template já foi usado"
            description="Este template já foi usado em programas ou sessões. Arquive-o para impedir novos usos sem afetar o histórico."
            confirmLabel="Arquivar em vez disso"
            cancelLabel="Cancelar"
            onConfirm={() => { archiveWorkoutTemplate(deletingTemplate.id); setDeletingTemplate(null); reload() }}
            onCancel={() => setDeletingTemplate(null)}
          />
        ) : (
          <ConfirmDialog
            title="Excluir template?"
            description={`"${deletingTemplate.name}" será removido permanentemente.`}
            confirmLabel="Excluir"
            isDanger
            onConfirm={confirmDelete}
            onCancel={() => setDeletingTemplate(null)}
          />
        )
      )}
    </div>
  )
}
