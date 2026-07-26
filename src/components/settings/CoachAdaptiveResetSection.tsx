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
 * Reset granular do Coach + Adaptive Planning (Sprint 27). Apaga decisões do
 * Coach, propostas adaptativas e o audit trail — nunca reverte uma mudança
 * já aplicada (uma proposta `applied` já faz parte do programa/Planner
 * atual; apagar o registro não desfaz a mutação, só remove o rastro de como
 * ela aconteceu).
 */
export function CoachAdaptiveResetSection({ isConfirming, resetText, onStart, onResetTextChange, onConfirm, onCancel }: Props) {
  return (
    <section className="card card--danger-border">
      <h3 className="section-label settings-section__title settings-section__title--danger">
        🧭 Apagar Coach e ajustes adaptativos
      </h3>
      <p className="settings-section__body">
        Remove decisões do Coach, propostas de ajuste adaptativo e o histórico de auditoria. Mudanças de plano já
        aplicadas continuam valendo — este reset apaga só o registro da decisão, não desfaz nenhuma alteração feita
        no programa ou no Planner.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn btn--danger btn--full" onClick={onStart}>
          🗑️ Apagar Coach e ajustes adaptativos
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-label="Confirmar exclusão de Coach e ajustes adaptativos"
          className="settings-confirm settings-confirm--danger"
          style={{ marginTop: 0 }}
        >
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
              Apagar Coach e ajustes adaptativos
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
