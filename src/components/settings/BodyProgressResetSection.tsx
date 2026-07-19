"use client"

type Props = {
  isConfirming: boolean
  resetText: string
  deletePhotos: boolean
  onStart: () => void
  onResetTextChange: (value: string) => void
  onDeletePhotosChange: (value: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reset granular, escopado ao progresso corporal (peso, medidas, observações) —
 * Sprint 19 Parte 4. Estrutura idêntica a `DataResetSection`/`PhotoResetSection`,
 * mas pergunta explicitamente sobre as fotos vinculadas antes de apagar, em vez
 * de decidir por conta própria (fase 29 do spec da sprint).
 */
export function BodyProgressResetSection({
  isConfirming,
  resetText,
  deletePhotos,
  onStart,
  onResetTextChange,
  onDeletePhotosChange,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <section className="card card--danger-border">
      <h3 className="section-label settings-section__title settings-section__title--danger">
        📉 Apagar progresso corporal
      </h3>
      <p className="settings-section__body">
        Remove todos os registros de peso, medidas e observações. Check-ins de bem-estar, ciclos e treinos não são
        afetados.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn btn--danger btn--full" onClick={onStart}>
          🗑️ Apagar progresso corporal
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirmar exclusão de progresso corporal" className="settings-confirm settings-confirm--danger" style={{ marginTop: 0 }}>
          <p className="settings-confirm__title settings-confirm__title--danger">Esta ação é irreversível.</p>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", marginBottom: "var(--space-2)" }}>
            <input
              type="checkbox"
              checked={deletePhotos}
              onChange={(e) => onDeletePhotosChange(e.target.checked)}
            />
            Também apagar as fotos vinculadas a esses registros
          </label>

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
              Apagar progresso corporal
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
