"use client"

import { useId, useMemo, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import type { TrainingProgram } from "@/lib/training-programs"
import {
  getNextMonday,
  getToday,
  previewProgramInstantiation,
  instantiateProgramIntoPlanner,
  type ProgramInstantiationConflictStrategy,
} from "@/lib/program-instantiation"
import { createCycle, getActiveCycle } from "@/lib/training-cycles"

type ProgramInstantiationDialogProps = {
  program: TrainingProgram
  onDone: () => void
  onClose: () => void
}

type StartOption = "next-monday" | "today" | "custom"

export function ProgramInstantiationDialog({ program, onDone, onClose }: ProgramInstantiationDialogProps) {
  const titleId = useId()
  const [startOption, setStartOption] = useState<StartOption>("next-monday")
  const [customDate, setCustomDate] = useState(getToday())
  const [strategy, setStrategy] = useState<ProgramInstantiationConflictStrategy>("keep")
  const [createCycleAfter, setCreateCycleAfter] = useState(false)
  const [cycleName, setCycleName] = useState(`Ciclo — ${program.name}`)
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const startDate = startOption === "next-monday" ? getNextMonday() : startOption === "today" ? getToday() : customDate

  const preview = useMemo(() => previewProgramInstantiation(program, startDate), [program, startDate])

  function handleConfirm() {
    const result = instantiateProgramIntoPlanner(program, startDate, strategy)
    if (result.cancelled) {
      onClose()
      return
    }

    let cycleMessage = ""
    if (createCycleAfter) {
      if (getActiveCycle()) {
        cycleMessage = " Ciclo não criado: já existe um ciclo ativo."
      } else {
        const cycleResult = createCycle({ name: cycleName.trim() || program.name, goal: "general", startDate, plannedWeeks: program.weeks.length })
        if (!cycleResult.ok) cycleMessage = ` Ciclo não criado: ${cycleResult.error}`
      }
    }

    setMessage(`${result.created.length} sessão(ões) adicionada(s) ao Planner.${cycleMessage}`)
    setDone(true)
  }

  if (done) {
    return (
      <ModalShell labelledBy={titleId} onClose={onDone}>
        <h3 id={titleId} className="modal-title">Programa instanciado</h3>
        <p className="mt-2 text-sm text-secondary">{message}</p>
        <button type="button" className="btn btn--primary btn--full mt-4" onClick={onDone}>
          Concluir
        </button>
      </ModalShell>
    )
  }

  return (
    <ModalShell labelledBy={titleId} variant="sheet" onClose={onClose}>
      <div className="modal-header">
        <h3 id={titleId} className="modal-title">Iniciar programa</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <span className="field-label">Começar em</span>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="start-option" checked={startOption === "next-monday"} onChange={() => setStartOption("next-monday")} />
              Próxima segunda-feira ({getNextMonday()})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="start-option" checked={startOption === "today"} onChange={() => setStartOption("today")} />
              Hoje ({getToday()})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="start-option" checked={startOption === "custom"} onChange={() => setStartOption("custom")} />
              Data personalizada
            </label>
            {startOption === "custom" && (
              <input type="date" className="input" value={customDate} onChange={(e) => setCustomDate(e.target.value)} style={{ width: 180 }} />
            )}
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-secondary">
            {preview.totalWeeks} semana{preview.totalWeeks !== 1 ? "s" : ""} · {preview.totalSessions} {preview.totalSessions !== 1 ? "sessões" : "sessão"}
            {preview.endDate && <> · até {preview.endDate}</>}
          </p>
          {preview.conflicts.length > 0 && (
            <p className="text-sm" style={{ color: "var(--color-warning)" }}>
              {preview.conflicts.length} dia(s) já possuem sessões planejadas.
            </p>
          )}
        </div>

        {preview.conflicts.length > 0 && (
          <div>
            <span className="field-label">Conflitos encontrados</span>
            <div className="flex flex-col gap-1">
              {preview.conflicts.map((c) => (
                <label key={c.date} className="text-xs text-muted">{c.date}: {c.incomingSessionNames.join(", ")}</label>
              ))}
            </div>
            <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="conflict-strategy" checked={strategy === "keep"} onChange={() => setStrategy("keep")} />
                Manter existentes e adicionar
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="conflict-strategy" checked={strategy === "replace"} onChange={() => setStrategy("replace")} />
                Substituir
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="conflict-strategy" checked={strategy === "skip"} onChange={() => setStrategy("skip")} />
                Pular dias com conflito
              </label>
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createCycleAfter} onChange={(e) => setCreateCycleAfter(e.target.checked)} />
            Criar novo ciclo de treino a partir deste programa
          </label>
          {createCycleAfter && (
            <input className="input mt-2" value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="Nome do ciclo" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn--primary" onClick={handleConfirm}>Confirmar</button>
        </div>
      </div>
    </ModalShell>
  )
}
