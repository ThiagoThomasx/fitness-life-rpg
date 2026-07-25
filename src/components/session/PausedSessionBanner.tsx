"use client"

type PausedSessionBannerProps = {
  onResume: () => void
  onDiscard: () => void
}

/** Não esconde dados da sessão (Fase 31) — só some quando o usuário retoma ou descarta. */
export function PausedSessionBanner({ onResume, onDiscard }: PausedSessionBannerProps) {
  return (
    <div className="alert alert--warning" role="status">
      <div>
        <p className="text-sm font-semibold">⏸️ Sessão pausada</p>
        <p className="text-xs" style={{ marginTop: "var(--space-1)" }}>
          Seus dados estão preservados. Retome quando estiver pronto.
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn--ghost" onClick={onDiscard}>
          Descartar sessão
        </button>
        <button type="button" className="btn btn--primary" onClick={onResume}>
          Retomar
        </button>
      </div>
    </div>
  )
}
