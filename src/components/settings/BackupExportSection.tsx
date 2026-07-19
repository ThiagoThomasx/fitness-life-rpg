"use client"

type Props = {
  onExport: () => void
}

export function BackupExportSection({ onExport }: Props) {
  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Exportar backup</h3>
      <p className="settings-section__body">
        Baixa um arquivo <code>.json</code> com todos os seus dados locais. Guarde em local seguro.
      </p>
      <p className="settings-section__body" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Fotos de progresso não são incluídas no backup — permanecem apenas neste navegador.
      </p>
      <button type="button" className="btn btn--primary btn--full" onClick={onExport}>
        ⬇️ Exportar backup JSON
      </button>
    </section>
  )
}
