"use client"

import type { InsightsData } from "@/lib/insights"
import { ChartHeader, EmptyChart } from "./ChartCard"

type Props = {
  data: InsightsData
}

export function PrsSection({ data }: Props) {
  return (
    <section className="card">
      <ChartHeader title="Recordes pessoais" description="Seus últimos PRs registrados nos exercícios" />
      {data.recentPrs.length === 0 ? (
        <EmptyChart icon="🏆" title="Nenhum recorde ainda" description="Bata seu primeiro recorde pessoal para vê-lo aqui" ctaLabel="Treinar agora" ctaHref="/treinos" />
      ) : (
        <div className="pr-list">
          {data.recentPrs.map((pr, i) => (
            <div key={i} className="pr-item">
              <div className="pr-item__icon" aria-hidden="true">🏆</div>
              <div className="pr-item__body">
                <div className="pr-item__name">{pr.exerciseName}</div>
                <div className="pr-item__date">{pr.date}</div>
              </div>
              <span className="pr-item__value numeric">{pr.weight_kg} kg</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
