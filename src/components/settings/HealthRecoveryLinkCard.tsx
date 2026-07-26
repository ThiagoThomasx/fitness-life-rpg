import Link from "next/link"

export function HealthRecoveryLinkCard() {
  return (
    <Link href="/saude" className="card card--interactive settings-link-card">
      <span className="settings-link-card__icon" aria-hidden="true">🩺</span>
      <div style={{ flex: 1 }}>
        <div className="settings-link-card__title">Saúde e recuperação</div>
        <div className="settings-link-card__subtitle">
          Sono, frequência cardíaca de repouso, atividade, baselines e conflitos
        </div>
      </div>
      <span className="settings-link-card__chevron" aria-hidden="true">›</span>
    </Link>
  )
}
