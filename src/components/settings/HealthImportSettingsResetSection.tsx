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
 * Reset granular de Configurações de Importação (Sprint 30 Parte 4, seção
 * 16). Apaga apenas os presets de mapeamento salvos — nunca os registros de
 * saúde já importados por eles, nem o peso em Body Progress.
 */
export function HealthImportSettingsResetSection({
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
        🧾 Apagar Configurações de importação
      </h3>
      <p className="settings-section__body">
        Remove os presets de mapeamento salvos (colunas, unidades, transformações). Os dados de saúde já importados
        com esses presets não são afetados — apenas o mapeamento reutilizável é apagado.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn btn--danger btn--full" onClick={onStart}>
          🗑️ Apagar Configurações de importação
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-label="Confirmar exclusão de Configurações de importação"
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
              Apagar Configurações de importação
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
