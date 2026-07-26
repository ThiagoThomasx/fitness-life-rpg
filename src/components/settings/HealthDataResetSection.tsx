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
 * Reset granular de Dados de Saúde (Sprint 28 Parte 4). Apaga apenas os
 * registros de saúde (sono, passos, FC de repouso, etc.) — nunca treinos,
 * Readiness subjetivo ou Body Progress. Peso permanece no Body Progress,
 * pois nunca é duplicado em Health Data (sempre lido sob demanda).
 */
export function HealthDataResetSection({ isConfirming, resetText, onStart, onResetTextChange, onConfirm, onCancel }: Props) {
  return (
    <section className="card card--danger-border">
      <h3 className="section-label settings-section__title settings-section__title--danger">
        🩺 Apagar Dados de saúde
      </h3>
      <p className="settings-section__body">
        Remove os registros de saúde (sono, passos, frequência cardíaca de repouso, atividade e demais métricas
        importadas ou lançadas manualmente). Treinos, Readiness, Recovery e Body Progress não são afetados — o peso
        do Body Progress continua disponível normalmente, pois nunca é duplicado aqui.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn btn--danger btn--full" onClick={onStart}>
          🗑️ Apagar Dados de saúde
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-label="Confirmar exclusão de Dados de saúde"
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
              Apagar Dados de saúde
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
