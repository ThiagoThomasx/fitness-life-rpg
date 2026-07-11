"use client"

import type { DailyLogEntry } from "@/lib/daily-log"
import { LogCard } from "./LogCard"

type Props = {
  todayLogs: DailyLogEntry[]
  pastLogs: DailyLogEntry[]
  showForm: boolean
  onEdit: (log: DailyLogEntry) => void
  onDelete: (id: string) => void
}

export function EntriesSection({ todayLogs, pastLogs, showForm, onEdit, onDelete }: Props) {
  const isEmpty = todayLogs.length === 0 && pastLogs.length === 0

  if (isEmpty && !showForm) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">📓</div>
        <p className="empty-state__desc">Nenhuma entrada ainda. Registre seu primeiro dia!</p>
      </div>
    )
  }

  return (
    <>
      {todayLogs.length > 0 && !showForm && (
        <section>
          <h3 className="section-label">
            Hoje · {todayLogs.length} entrada{todayLogs.length > 1 ? "s" : ""}
          </h3>
          <div className="entries-list">
            {todayLogs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                isToday
                onEdit={() => onEdit(log)}
                onDelete={() => onDelete(log.id)}
              />
            ))}
          </div>
        </section>
      )}

      {pastLogs.length > 0 && (
        <section>
          <h3 className="section-label">Histórico</h3>
          <div className="entries-list">
            {pastLogs.map((log) => <LogCard key={log.id} log={log} />)}
          </div>
        </section>
      )}
    </>
  )
}
