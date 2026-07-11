"use client"

import { BADGE_DEFINITIONS, type BadgeDef, type EarnedBadge } from "@/lib/badges"
import type { Character } from "@/types/database"

export type BadgeProgressContext = {
  workoutCount: number
  totalPrs: number
  diaryCount: number
  character: Character
}

/**
 * Progresso parcial derivado dos mesmos dados que os critérios reais usam
 * (lib/badges.checkAndEarnBadges). Tipos sem dado carregado no Perfil
 * (nutrição/plano/campanha) não mostram progresso — apenas o critério.
 */
function badgeProgress(def: BadgeDef, ctx: BadgeProgressContext): { current: number; target: number } | null {
  const target = def.requirementValue
  switch (def.requirementType) {
    case "workout_count":
      return { current: Math.min(ctx.workoutCount, target), target }
    case "pr_count":
      return { current: Math.min(ctx.totalPrs, target), target }
    case "level":
      return { current: Math.min(ctx.character.level, target), target }
    case "diary_count":
      return { current: Math.min(ctx.diaryCount, target), target }
    case "attribute_value": {
      const key = def.requirementAttribute
      if (!key) return null
      return { current: Math.min(Math.floor(ctx.character[key]), target), target }
    }
    default:
      return null
  }
}

function formatDate(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("pt-BR")
}

type Props = {
  earnedBadges: EarnedBadge[]
  progressCtx: BadgeProgressContext
}

export function BadgesGrid({ earnedBadges, progressCtx }: Props) {
  const earnedById = new Map(earnedBadges.map((b) => [b.badgeId, b]))

  const earned = BADGE_DEFINITIONS.filter((def) => earnedById.has(def.id)).sort((a, b) => {
    const dateA = earnedById.get(a.id)?.earnedAt ?? ""
    const dateB = earnedById.get(b.id)?.earnedAt ?? ""
    return dateB.localeCompare(dateA)
  })
  const locked = BADGE_DEFINITIONS.filter((def) => !earnedById.has(def.id))

  return (
    <ul className="badges-grid">
      {[...earned, ...locked].map((def) => {
        const earnedBadge = earnedById.get(def.id)
        const isEarned = Boolean(earnedBadge)
        const earnedDate = earnedBadge ? formatDate(earnedBadge.earnedAt) : null
        const progress = isEarned ? null : badgeProgress(def, progressCtx)

        return (
          <li
            key={def.id}
            className={isEarned ? "badge-card" : "badge-card badge-card--locked"}
            aria-label={
              isEarned
                ? `${def.name} — desbloqueada${earnedDate ? ` em ${earnedDate}` : ""}`
                : `${def.name} — bloqueada. Critério: ${def.description}`
            }
          >
            {!isEarned && (
              <span className="badge-card__lock" aria-hidden="true">
                🔒
              </span>
            )}
            <span className="badge-card__icon" aria-hidden="true">
              {def.icon}
            </span>
            <span className="badge-card__name">{def.name}</span>
            <span className="badge-card__desc">{def.description}</span>

            {isEarned ? (
              <span className="badge-card__date numeric">✓ {earnedDate ?? "desbloqueada"}</span>
            ) : progress ? (
              <span className="badge-card__progress">
                <span className="badge-card__progress-label numeric">
                  {progress.current}/{progress.target}
                </span>
                <span className="progress-track progress-track--thin block">
                  <span
                    className="progress-fill progress-fill--accent block"
                    style={{ width: `${Math.min((progress.current / progress.target) * 100, 100)}%` }}
                  />
                </span>
              </span>
            ) : (
              <span className="badge-card__status">Bloqueada</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
