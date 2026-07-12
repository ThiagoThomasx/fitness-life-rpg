"use client"

import type { InsightsData } from "@/lib/insights"
import type { RecordType } from "@/lib/exercise-records"
import { ChartHeader, EmptyChart } from "./ChartCard"

type Props = {
  data: InsightsData
}

const TYPE_ICON: Record<RecordType, string> = {
  first_time: "🆕",
  weight: "🥇",
  volume: "📦",
  reps: "🔁",
}

const TYPE_LABEL: Record<RecordType, string> = {
  first_time: "Estreia",
  weight: "Peso",
  volume: "Volume",
  reps: "Reps",
}

export function PrsSection({ data }: Props) {
  return (
    <section className="card">
      <ChartHeader title="Recordes pessoais" description="Seus últimos recordes registrados nos exercícios" />
      {data.recentRecords.length === 0 ? (
        <EmptyChart icon="🏆" title="Ainda sem histórico suficiente" description="Bata seu primeiro recorde pessoal para vê-lo aqui" ctaLabel="Treinar agora" ctaHref="/treinos" />
      ) : (
        <div className="pr-list">
          {data.recentRecords.map((rec, i) => (
            <div key={i} className="pr-item">
              <div className="pr-item__icon" aria-hidden="true">{TYPE_ICON[rec.type]}</div>
              <div className="pr-item__body">
                <div className="pr-item__name">{rec.exerciseName}</div>
                <div className="pr-item__date">{rec.date.slice(0, 10)}</div>
              </div>
              <span className="pr-item__value">{TYPE_LABEL[rec.type]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
