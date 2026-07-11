import Link from "next/link"

export function PreferencesLinkCard() {
  return (
    <Link href="/preferencias" className="card card--interactive settings-link-card">
      <span className="settings-link-card__icon" aria-hidden="true">⚙️</span>
      <div style={{ flex: 1 }}>
        <div className="settings-link-card__title">Preferências pessoais</div>
        <div className="settings-link-card__subtitle">
          Objetivo, equipamentos, dias preferidos e estilo de treino
        </div>
      </div>
      <span className="settings-link-card__chevron" aria-hidden="true">›</span>
    </Link>
  )
}
