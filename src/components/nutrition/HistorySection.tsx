"use client"

import type { NutritionLog } from "@/lib/nutrition"

type Props = {
  logs: NutritionLog[]
}

export function HistorySection({ logs }: Props) {
  if (logs.length === 0) return null
  const recent = logs.slice(0, 7)

  return (
    <section className="card">
      <div className="section-label">Histórico recente</div>
      <div className="history-list">
        {recent.map((log) => (
          <div key={log.id} className="history-row">
            <span className="history-row__icon" aria-hidden="true">🥗</span>
            <div className="history-row__body">
              <div className="history-row__date">{log.date}</div>
              <div className="history-row__macros">
                P: {log.protein_g}g · C: {log.carbs_g}g · G: {log.fat_g}g
              </div>
            </div>
            <span className="history-row__calories">{log.calories} kcal</span>
          </div>
        ))}
      </div>
    </section>
  )
}
