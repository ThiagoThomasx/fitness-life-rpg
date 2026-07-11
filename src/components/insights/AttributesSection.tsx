"use client"

import type { useCharacterStore } from "@/stores/useCharacterStore"
import { attributeColor } from "@/lib/theme-colors"
import { ChartHeader } from "./ChartCard"

const ATTRIBUTES = [
  { key: "strength" as const, label: "Força", icon: "💪" },
  { key: "agility" as const, label: "Agilidade", icon: "⚡" },
  { key: "dexterity" as const, label: "Destreza", icon: "🎯" },
  { key: "constitution" as const, label: "Constituição", icon: "🛡️" },
  { key: "vitality" as const, label: "Vitalidade", icon: "❤️" },
]

type Props = {
  character: ReturnType<typeof useCharacterStore.getState>["character"]
}

export function AttributesSection({ character }: Props) {
  if (!character) return null

  const data = ATTRIBUTES.map((a) => ({ ...a, value: character[a.key] as number, color: attributeColor(a.key).fill }))
  const maxVal = Math.max(...data.map((d) => d.value), 10)

  return (
    <section className="card">
      <ChartHeader title="Atributos do personagem" description="Seus pontos de atributo acumulados com o treino" />
      <div className="flex flex-col gap-3.5">
        {data.map((attr) => {
          const pct = Math.min((attr.value / maxVal) * 100, 100)
          return (
            <div key={attr.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "var(--text-sm)" }}>{attr.icon}</span>
                  <span className="text-secondary" style={{ fontSize: "var(--text-sm)" }}>{attr.label}</span>
                </div>
                <span className="numeric font-extrabold text-primary" style={{ fontSize: "var(--text-sm)" }}>
                  {attr.value.toFixed(1)}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: attr.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
