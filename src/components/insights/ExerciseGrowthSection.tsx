"use client"

import type { InsightsData } from "@/lib/insights"
import type { ExerciseGrowthEntry } from "@/lib/exercise-records"
import { ChartHeader } from "./ChartCard"

type Props = {
  data: InsightsData
}

function GrowthList({ entries, positive }: { entries: ExerciseGrowthEntry[]; positive: boolean }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted">Ainda sem histórico suficiente.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => (
        <div key={e.exerciseId} className="flex items-center justify-between gap-2">
          <span className="text-sm text-secondary min-w-0 truncate">{e.exerciseName}</span>
          <span
            className="numeric text-xs font-bold flex-shrink-0"
            style={{ color: positive ? "var(--color-streak)" : "var(--color-text-muted)" }}
          >
            {e.deltaKg > 0 ? "+" : ""}
            {e.deltaKg}kg
          </span>
        </div>
      ))}
    </div>
  )
}

export function ExerciseGrowthSection({ data }: Props) {
  return (
    <section className="card">
      <ChartHeader title="Evolução por exercício" description="Quem está subindo de carga e quem está parado" />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="section-label mb-2">Em alta</div>
          <GrowthList entries={data.topGrowthExercises} positive />
        </div>
        <div>
          <div className="section-label mb-2">Estagnados</div>
          <GrowthList entries={data.stagnantExercises} positive={false} />
        </div>
      </div>
    </section>
  )
}
