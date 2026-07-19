"use client"

import { useState } from "react"
import { Stepper } from "@/components/ui/Stepper"
import {
  saveTrainingProgram,
  updateTrainingProgram,
  type TrainingProgram,
  type TrainingProgramWeek,
} from "@/lib/training-programs"
import { ProgramWeekEditor } from "./ProgramWeekEditor"
import { ProgramSummary } from "./ProgramSummary"

type ProgramEditorWizardProps = {
  initial?: TrainingProgram
  onSaved: (program: TrainingProgram) => void
  onClose: () => void
}

const STEPS = ["Informações", "Semanas iniciais", "Sessões", "Revisão"]

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildInitialWeeks(count: number): TrainingProgramWeek[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `week-${uniqueSuffix()}-${i}`,
    weekNumber: i + 1,
    sessions: [],
  }))
}

export function ProgramEditorWizard({ initial, onSaved, onClose }: ProgramEditorWizardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [objective, setObjective] = useState(initial?.objective ?? "")
  const [level, setLevel] = useState(initial?.level ?? "")
  const [weekCount, setWeekCount] = useState(initial?.weeks.length || 4)
  const [weeks, setWeeks] = useState<TrainingProgramWeek[]>(initial?.weeks ?? [])
  const [weeksInitialized, setWeeksInitialized] = useState(Boolean(initial))
  const [errors, setErrors] = useState<string[]>([])

  function goNext() {
    if (stepIndex === 1 && !weeksInitialized) {
      setWeeks(buildInitialWeeks(weekCount))
      setWeeksInitialized(true)
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function handleSave() {
    const payload = { name: name.trim(), description: description.trim() || undefined, objective: objective || undefined, level: level || undefined, weeks, tags: initial?.tags ?? [] }
    const result = initial ? updateTrainingProgram(initial.id, payload) : saveTrainingProgram(payload)
    if (!result.ok || !result.program) {
      setErrors((result.errors ?? []).map((e) => e.message))
      return
    }
    onSaved(result.program)
  }

  const canGoNextFromInfo = Boolean(name.trim())

  return (
    <Stepper
      title={initial ? "Editar programa" : "Criar programa"}
      steps={STEPS}
      currentStepIndex={stepIndex}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={stepIndex === 0 ? onClose : goBack}>
            {stepIndex === 0 ? "Cancelar" : "Voltar"}
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" className="btn btn--primary" onClick={goNext} disabled={stepIndex === 0 && !canGoNextFromInfo}>
              Próximo
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={handleSave}>
              {initial ? "Salvar alterações" : "Criar programa"}
            </button>
          )}
        </>
      }
    >
      {errors.length > 0 && (
        <div className="alert alert--danger" role="alert">
          <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {stepIndex === 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="program-name">Nome do programa *</label>
            <input id="program-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bloco de hipertrofia 8 semanas" />
          </div>
          <div>
            <label className="field-label" htmlFor="program-desc">Descrição</label>
            <input id="program-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="field-label" htmlFor="program-objective">Objetivo</label>
              <input id="program-objective" className="input" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex: Hipertrofia" />
            </div>
            <div className="flex-1">
              <label className="field-label" htmlFor="program-level">Nível</label>
              <input id="program-level" className="input" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Ex: Intermediário" />
            </div>
          </div>
        </div>
      )}

      {stepIndex === 1 && (
        <div className="flex flex-col gap-3">
          <label className="field-label" htmlFor="program-week-count">Quantidade inicial de semanas</label>
          <input
            id="program-week-count"
            className="input"
            type="number"
            min={1}
            max={52}
            value={weekCount}
            onChange={(e) => setWeekCount(Number(e.target.value) || 1)}
            style={{ width: 120 }}
            disabled={weeksInitialized}
          />
          <p className="text-xs text-muted">
            Você poderá adicionar ou duplicar semanas depois. Não é necessário um calendário real nesta etapa.
          </p>
        </div>
      )}

      {stepIndex === 2 && <ProgramWeekEditor weeks={weeks} onChange={setWeeks} />}

      {stepIndex === 3 && <ProgramSummary weeks={weeks} />}
    </Stepper>
  )
}
