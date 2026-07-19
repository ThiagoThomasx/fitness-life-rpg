"use client"

type Props = {
  isConfirming: boolean
  resetText: string
  resetTemplates: boolean
  resetPrograms: boolean
  onStart: () => void
  onResetTextChange: (value: string) => void
  onResetTemplatesChange: (value: boolean) => void
  onResetProgramsChange: (value: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reset granular de templates/programas (Sprint 20 — Parte 1). Apagar
 * templates não remove sessões planejadas/concluídas nem os snapshots já
 * capturados dentro de programas. Apagar programas não remove o Planner nem
 * ciclos — só a estrutura reutilizável de semanas/sessões.
 */
export function TemplatesProgramsResetSection({
  isConfirming,
  resetText,
  resetTemplates,
  resetPrograms,
  onStart,
  onResetTextChange,
  onResetTemplatesChange,
  onResetProgramsChange,
  onConfirm,
  onCancel,
}: Props) {
  const nothingSelected = !resetTemplates && !resetPrograms

  return (
    <section className="card card--danger-border">
      <h3 className="section-label settings-section__title settings-section__title--danger">
        🧩 Apagar templates e programas
      </h3>
      <p className="settings-section__body">
        Remove templates de treino e/ou programas semanais. Sessões planejadas, sessões concluídas e ciclos não são
        afetados — eles guardam snapshots próprios.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn btn--danger btn--full" onClick={onStart}>
          🗑️ Apagar templates e programas
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirmar exclusão de templates e programas" className="settings-confirm settings-confirm--danger" style={{ marginTop: 0 }}>
          <p className="settings-confirm__title settings-confirm__title--danger">Esta ação é irreversível.</p>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", marginBottom: "var(--space-1)" }}>
            <input type="checkbox" checked={resetTemplates} onChange={(e) => onResetTemplatesChange(e.target.checked)} />
            Templates de treino
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", marginBottom: "var(--space-2)" }}>
            <input type="checkbox" checked={resetPrograms} onChange={(e) => onResetProgramsChange(e.target.checked)} />
            Programas de treino
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
              disabled={nothingSelected || resetText.trim().toLowerCase() !== "resetar"}
              onClick={onConfirm}
            >
              Apagar selecionados
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
