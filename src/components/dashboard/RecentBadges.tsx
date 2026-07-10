"use client"

import { BADGE_DEFINITIONS } from "@/lib/badges"
import type { EarnedBadge } from "@/lib/badges"

export function RecentBadges({ badges }: { badges: EarnedBadge[] }) {
  const recent = badges.slice(0, 4)
  if (recent.length === 0) return null

  return (
    <section className="card" aria-label="Badges recentes">
      <div className="section-label">Badges recentes</div>
      <div className="flex flex-wrap gap-3">
        {recent.map((earned) => {
          const def = BADGE_DEFINITIONS.find((b) => b.id === earned.badgeId)
          if (!def) return null
          return (
            <div key={earned.badgeId} className="flex min-w-[60px] flex-col items-center gap-1.5">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-card text-xl"
                style={{ background: "var(--color-streak-muted)", border: "1px solid var(--color-streak)" }}
                aria-hidden="true"
              >
                {def.icon}
              </div>
              <span className="max-w-[60px] text-center text-[0.58rem] leading-tight text-secondary">
                {def.name}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
