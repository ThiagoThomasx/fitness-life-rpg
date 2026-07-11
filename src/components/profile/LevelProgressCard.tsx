"use client"

import type { Character } from "@/types/database"
import { xpProgress, xpToNextLevel } from "@/stores/useCharacterStore"

type Props = {
  character: Character
}

export function LevelProgressCard({ character }: Props) {
  const needed = xpToNextLevel(character.level)
  // xpProgress já limita a 1; o clamp inferior protege contra dados corrompidos
  const progress = Math.max(0, xpProgress(character))
  // floor: não mostrar "100%" enquanto ainda falta XP para o próximo nível
  const pct = Math.floor(progress * 100)
  const currentXp = Math.max(0, Math.floor(character.current_xp))
  const remaining = Math.max(0, needed - currentXp)

  return (
    <section className="card" aria-label="Progresso de nível">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="section-label" style={{ marginBottom: "var(--space-1)" }}>
            Nível atual
          </div>
          <div className="flex items-baseline gap-2">
            <span className="display-heading numeric text-3xl">{character.level}</span>
            <span className="numeric text-xs text-muted">
              {Math.min(currentXp, needed).toLocaleString("pt-BR")} / {needed.toLocaleString("pt-BR")} XP
            </span>
          </div>
        </div>
        <div
          className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-card bg-forest"
          aria-hidden="true"
        >
          <span className="numeric text-xl font-bold text-accent">{character.level}</span>
          <span className="text-[0.55rem] uppercase tracking-wider text-accent opacity-70">
            nível
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between">
          <span className="text-xs uppercase tracking-wide text-muted">
            Progresso para o nível {character.level + 1}
          </span>
          <span className="numeric text-xs font-bold text-accent">{pct}%</span>
        </div>
        <div
          className="xp-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`${currentXp} de ${needed} XP para o nível ${character.level + 1}`}
        >
          <div className="xp-bar__fill" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-3">
        <span className="text-xs text-secondary">
          {remaining > 0 ? (
            <>
              Faltam <strong className="numeric text-accent">{remaining.toLocaleString("pt-BR")} XP</strong>{" "}
              para o nível {character.level + 1}
            </>
          ) : (
            <>Pronto para subir de nível no próximo treino!</>
          )}
        </span>
        <span className="numeric text-xs text-muted">
          Total: {Math.floor(character.total_xp).toLocaleString("pt-BR")} XP
        </span>
      </div>
    </section>
  )
}
