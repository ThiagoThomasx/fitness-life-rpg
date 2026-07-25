"use client"

import type { ActiveExerciseSource, ActiveExerciseStatus } from "@/lib/active-workout"

type ExerciseExecutionActionsProps = {
  source?: ActiveExerciseSource
  executionStatus: ActiveExerciseStatus
  isFirst: boolean
  isLast: boolean
  onSubstitute: () => void
  onRevertSubstitution: () => void
  onSkip: () => void
  onRestore: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

/**
 * Ações por origem (Fase 43) — treino livre não ganha nenhum botão novo aqui,
 * continua só com o "remover" já existente no cabeçalho do card.
 */
export function ExerciseExecutionActions({
  source,
  executionStatus,
  isFirst,
  isLast,
  onSubstitute,
  onRevertSubstitution,
  onSkip,
  onRestore,
  onMoveUp,
  onMoveDown,
}: ExerciseExecutionActionsProps) {
  if (!source || source === "free") return null

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ marginTop: "var(--space-2)" }}
      role="group"
      aria-label="Ações do exercício"
    >
      {source === "planned" && (
        <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={onSubstitute}>
          Substituir
        </button>
      )}
      {source === "substitution" && (
        <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={onRevertSubstitution}>
          Voltar ao exercício planejado
        </button>
      )}
      {(source === "planned" || source === "substitution") &&
        (executionStatus === "skipped" ? (
          <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={onRestore}>
            Voltar para pendente
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={onSkip}>
            Marcar como não realizado
          </button>
        ))}
      <button
        type="button"
        className="icon-btn"
        onClick={onMoveUp}
        disabled={isFirst}
        aria-label="Mover exercício para cima"
      >
        ↑
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={onMoveDown}
        disabled={isLast}
        aria-label="Mover exercício para baixo"
      >
        ↓
      </button>
    </div>
  )
}
