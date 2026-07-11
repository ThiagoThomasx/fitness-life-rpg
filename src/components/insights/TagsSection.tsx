"use client"

import type { InsightsData } from "@/lib/insights"
import { ChartHeader } from "./ChartCard"

type Props = {
  data: InsightsData
}

export function TagsSection({ data }: Props) {
  if (data.tagFrequency.length === 0) return null
  const max = data.tagFrequency[0].count

  return (
    <section className="card">
      <ChartHeader title="Tags do diário" description="Suas emoções e temas mais frequentes nas anotações" />
      <div className="tag-bars">
        {data.tagFrequency.map((t) => (
          <div key={t.tag} className="tag-bar">
            <span className="tag-bar__label">{t.tag}</span>
            <div className="tag-bar__track">
              <div className="tag-bar__fill" style={{ width: `${(t.count / max) * 100}%` }} />
            </div>
            <span className="tag-bar__count numeric">{t.count}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
