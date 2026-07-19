"use client"

import { useId, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import { getActiveWorkoutTemplates, type WorkoutTemplate } from "@/lib/workout-templates"
import { createWorkoutTemplateSnapshot, type TrainingProgramSession, type WorkoutTemplateSnapshot } from "@/lib/training-programs"

type ProgramSessionPickerProps = {
  onPick: (session: Omit<TrainingProgramSession, "id" | "dayIndex" | "preferredWeekday">) => void
  onClose: () => void
}

function emptySnapshot(name: string): WorkoutTemplateSnapshot {
  return { name, exerciseBlocks: [], capturedAt: new Date().toISOString() }
}

/**
 * Ao escolher um template, o snapshot é capturado imediatamente (Fase 30) —
 * editar o template depois não altera essa sessão.
 */
export function ProgramSessionPicker({ onPick, onClose }: ProgramSessionPickerProps) {
  const titleId = useId()
  const [search, setSearch] = useState("")
  const [blankName, setBlankName] = useState("")

  const templates = getActiveWorkoutTemplates().filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  function pickTemplate(template: WorkoutTemplate) {
    onPick({
      name: template.name,
      templateId: template.id,
      templateSnapshot: createWorkoutTemplateSnapshot(template),
      isOptional: false,
    })
  }

  function pickBlank() {
    const name = blankName.trim()
    if (!name) return
    onPick({ name, templateSnapshot: emptySnapshot(name), isOptional: false })
  }

  return (
    <ModalShell labelledBy={titleId} onClose={onClose}>
      <div className="modal-header">
        <h3 id={titleId} className="modal-title">Adicionar sessão</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
      </div>

      <input
        className="input mb-3"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar template..."
        aria-label="Buscar template"
      />

      {templates.length === 0 ? (
        <p className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
          Nenhum template disponível. Crie um em Templates de treino, ou use uma estrutura vazia abaixo.
        </p>
      ) : (
        <div className="picker-list mb-3">
          {templates.map((template) => (
            <button key={template.id} type="button" className="picker-row" onClick={() => pickTemplate(template)}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-primary">{template.name}</span>
                <span className="block truncate text-xs text-muted">
                  {template.exerciseBlocks.length} exercício{template.exerciseBlocks.length !== 1 ? "s" : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "var(--space-3)" }}>
        <span className="field-label">Ou crie uma sessão sem template</span>
        <div className="flex gap-2">
          <input
            className="input"
            value={blankName}
            onChange={(e) => setBlankName(e.target.value)}
            placeholder="Nome da sessão"
          />
          <button type="button" className="btn btn--secondary" onClick={pickBlank} disabled={!blankName.trim()}>
            Adicionar
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
