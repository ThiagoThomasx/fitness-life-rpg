"use client"

import { useEffect, useState } from "react"
import { getRecentRecords, type RecentRecordEntry, type RecordType } from "@/lib/exercise-records"

const TYPE_ICON: Record<RecordType, string> = {
  first_time: "🆕",
  weight: "🥇",
  volume: "📦",
  reps: "🔁",
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
}

export function RecentRecordsCard() {
  const [records, setRecords] = useState<RecentRecordEntry[] | undefined>(undefined)

  useEffect(() => {
    setRecords(getRecentRecords(5))
  }, [])

  if (records === undefined) return null

  if (records.length === 0) {
    return (
      <section className="card card--dashed flex flex-col items-center gap-2 text-center">
        <span className="text-2xl" aria-hidden="true">🏆</span>
        <p className="text-sm text-muted">Ainda sem histórico suficiente.</p>
      </section>
    )
  }

  return (
    <section className="card" aria-label="Últimos recordes">
      <div className="section-label">Últimos Recordes</div>
      <div className="flex flex-col gap-2">
        {records.map((r) => (
          <div key={`${r.exerciseId}-${r.date}`} className="flex items-center gap-2.5">
            <span aria-hidden="true">{TYPE_ICON[r.type]}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-secondary">{r.exerciseName}</span>
            <span className="text-xs text-muted flex-shrink-0">{formatDate(r.date)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
