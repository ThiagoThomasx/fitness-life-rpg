"use client"

type Props = {
  isConfirming: boolean
  resetText: string
  onStart: () => void
  onResetTextChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function DataResetSection({ isConfirming, resetText, onStart, onResetTextChange, onConfirm, onCancel }: Props) {
  return (
    <section className="card card--danger-border">
      <h3 className="section-label settings-section__title settings-section__title--danger">
        ⚠️ Resetar todos os dados
      </h3>
      <p className="settings-section__body">
        Apaga permanentemente todos os dados locais do app. Exporte um backup antes de continuar.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn btn--danger btn--full" onClick={onStart}>
          🗑️ Iniciar reset
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirmar reset" className="settings-confirm settings-confirm--danger" style={{ marginTop: 0 }}>
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
              Apagar tudo
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
