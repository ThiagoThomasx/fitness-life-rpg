"use client"

type Props = {
  isConfirming: boolean
  resetText: string
  onStart: () => void
  onResetTextChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reset granular do histórico de treinos (Sprint 23 §21-25). Apaga sessões
 * concluídas e os eventos de recorde derivados delas — sem isso, os recordes
 * ficariam órfãos, apontando para treinos que não existem mais. Templates,
 * programas, Planner e ciclos não são afetados.
 */
export function WorkoutHistoryResetSection({
  isConfirming,
  resetText,
  onStart,
  onResetTextChange,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <section className="card card--danger-border">
      <h3 className="section-label settings-section__title settings-section__title--danger">
        🏋️ Apagar histórico de treinos
      </h3>
      <p className="settings-section__body">
        Remove todas as sessões concluídas e os recordes pessoais derivados delas. Templates, programas, Planner e
        ciclos não são afetados.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn btn--danger btn--full" onClick={onStart}>
          🗑️ Apagar histórico de treinos
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirmar exclusão do histórico de treinos" className="settings-confirm settings-confirm--danger" style={{ marginTop: 0 }}>
          <p className="settings-confirm__title settings-confirm__title--danger">Esta ação é irreversível.</p>

          <p className="settings-confirm__body">
            Digite <strong>resetar</strong> abaixo para confirmar:
          </p>
          <input
            type="text"
            value={resetText}
            onChange={(e) => onResetTextChange(e.target.value)}
            placeholder="resetar"
            autoFocus
            aria-label="Digite resetar para confirmar"
            className="settings-confirm__input"
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm()
              if (e.key === "Escape") onCancel()
            }}
          />
          <div className="settings-confirm__actions">
            <button
              type="button"
              className="btn btn--danger"
              disabled={resetText.trim().toLowerCase() !== "resetar"}
              onClick={onConfirm}
            >
              Apagar histórico de treinos
            </button>
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
