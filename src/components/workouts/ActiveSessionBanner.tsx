"use client"

import { useRouter } from "next/navigation"
import { useSessionStore, formatElapsed } from "@/stores/useSessionStore"

type ActiveSessionBannerProps = {
  workoutName: string
}

export function ActiveSessionBanner({ workoutName }: ActiveSessionBannerProps) {
  const router = useRouter()
  const activeSets = useSessionStore((s) => s.activeSets)
  const elapsedSeconds = useSessionStore((s) => s.elapsedSeconds)

  const totalSets = activeSets.reduce((acc, s) => acc + s.sets.length, 0)

  return (
    <section className="active-banner" aria-label="Sessão de treino em andamento">
      <span className="active-banner__pulse" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="section-label" style={{ marginBottom: "2px" }}>
          Sessão em andamento
        </div>
        <div className="truncate text-base font-bold text-primary">{workoutName}</div>
        <div className="numeric mt-0.5 text-xs text-muted">
          {formatElapsed(elapsedSeconds)} · {activeSets.length} exercício{activeSets.length !== 1 ? "s" : ""} · {totalSets} série{totalSets !== 1 ? "s" : ""}
        </div>
      </div>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => router.push("/sessao")}
      >
        Continuar
      </button>
    </section>
  )
}
