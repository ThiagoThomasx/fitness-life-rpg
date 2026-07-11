"use client"

import type { DailyLogEntry } from "@/lib/daily-log"
import { EnergyStars } from "./EnergyStars"
import { TagChip } from "./TagChip"
import { formatDiaryDate, formatDiaryTime } from "./format"

type Props = {
  log: DailyLogEntry
  onEdit?: () => void
  onDelete?: () => void
  isToday?: boolean
}

export function LogCard({ log, onEdit, onDelete, isToday }: Props) {
  return (
    <div className="card card--sm log-card">
      <div className="log-card__header">
        <span className="log-card__date">
          {isToday ? `Hoje às ${formatDiaryTime(log.createdAt)}` : formatDiaryDate(log.date)}
        </span>
        <div className="log-card__actions">
          <span className="log-card__mood" aria-hidden="true">{log.mood}</span>
          <span className="badge-pill badge-pill--xp">+{log.xpEarned} XP</span>
          {onEdit && (
            <button onClick={onEdit} className="icon-btn icon-btn--sm" aria-label="Editar entrada">✏️</button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="icon-btn icon-btn--sm" aria-label="Remover entrada">🗑️</button>
          )}
        </div>
      </div>

      <div className="log-card__stats">
        <EnergyStars value={log.energyLevel} />
        <span className="log-card__sleep">💤 {log.sleepHours}h</span>
      </div>

      {log.notes && <p className="log-card__notes">{log.notes}</p>}

      {log.tags.length > 0 && (
        <div className="log-card__tags">
          {log.tags.map((t) => <TagChip key={t} tag={t} />)}
        </div>
      )}
    </div>
  )
}
