"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { InsightsData } from "@/lib/insights"
import { PIE_PALETTE } from "@/lib/theme-colors"
import { ChartHeader, EmptyChart, TOOLTIP_STYLE } from "./ChartCard"

type Props = {
  data: InsightsData
}

export function CategorySection({ data }: Props) {
  return (
    <section className="card">
      <ChartHeader title="Distribuição por categoria" description="Proporção de treinos por tipo de atividade" />
      {data.categoryDist.length === 0 ? (
        <EmptyChart icon="🥧" title="Sem dados" description="Complete treinos para ver a distribuição por categoria" />
      ) : (
        <div className="flex items-center gap-5">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie data={data.categoryDist} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                {data.categoryDist.map((_, i) => (
                  <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [`${v}x`, String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-1 flex-col gap-2">
            {data.categoryDist.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2.5">
                <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                <span className="flex-1 text-secondary" style={{ fontSize: "var(--text-sm)" }}>{cat.name}</span>
                <span className="numeric font-extrabold text-primary" style={{ fontSize: "var(--text-sm)" }}>{cat.value}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
