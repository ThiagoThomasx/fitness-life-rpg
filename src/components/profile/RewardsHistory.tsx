"use client"

import type { RewardEvent } from "@/lib/reward-events"
import { rewardColor } from "@/lib/theme-colors"

const MAX_VISIBLE = 8

function formatDateTime(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

type Props = {
  events: RewardEvent[]
}

export function RewardsHistory({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">
          🎁
        </div>
        <div className="empty-state__title">Nenhuma recompensa ainda</div>
        <div className="empty-state__desc">
          Complete treinos, registre o diário e suba de nível para desbloquear recompensas.
        </div>
      </div>
    )
  }

  return (
    <ul className="reward-history">
      {events.slice(0, MAX_VISIBLE).map((event) => {
        const colors = rewardColor(event.type)
        const date = formatDateTime(event.createdAt)
        return (
          <li
            key={event.id}
            className="reward-item"
            style={
              {
                "--reward-bg": colors.bg,
                "--reward-border": colors.border,
                "--reward-text": colors.text,
              } as React.CSSProperties
            }
          >
            <span className="reward-item__icon" aria-hidden="true">
              {event.icon}
            </span>
            <div className="reward-item__body">
              <div className="reward-item__title">{event.title}</div>
              {event.subtitle && <div className="reward-item__subtitle">{event.subtitle}</div>}
            </div>
            <div className="reward-item__meta">
              {event.value && <div className="reward-item__value numeric">{event.value}</div>}
              {date && <div className="reward-item__date numeric">{date}</div>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
