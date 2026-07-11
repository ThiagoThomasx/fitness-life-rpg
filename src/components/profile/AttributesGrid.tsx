"use client"

import type { Character } from "@/types/database"
import { attributeColor } from "@/lib/theme-colors"

const ATTRIBUTE_INFO = [
  { key: "strength" as const, label: "Força", icon: "💪", hint: "Treinos de força" },
  { key: "agility" as const, label: "Agilidade", icon: "⚡", hint: "Cardio e agilidade" },
  { key: "dexterity" as const, label: "Destreza", icon: "🎯", hint: "Flexibilidade" },
  { key: "constitution" as const, label: "Constituição", icon: "🛡️", hint: "Treinos de força" },
  { key: "vitality" as const, label: "Vitalidade", icon: "❤️", hint: "Cardio e flexibilidade" },
]

type Props = {
  character: Character
}

export function AttributesGrid({ character }: Props) {
  return (
    <div className="attr-grid">
      {ATTRIBUTE_INFO.map((attr) => {
        const raw = Math.max(0, character[attr.key] as number)
        const display = Math.floor(raw)
        const fracPct = Math.min(Math.round((raw - display) * 100), 100)
        const colors = attributeColor(attr.key)
        return (
          <div
            key={attr.key}
            className="attr-card"
            style={{ "--attr-color": colors.text } as React.CSSProperties}
          >
            <div className="attr-card__icon" aria-hidden="true">
              {attr.icon}
            </div>
            <div className="attr-card__name">{attr.label}</div>
            <div className="attr-card__value numeric">{display}</div>
            <div
              className="attr-card__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={fracPct}
              aria-label={`${attr.label}: ${fracPct}% para o próximo ponto`}
            >
              <div className="attr-card__progress-fill" style={{ width: `${fracPct}%` }} />
            </div>
            <div className="attr-card__hint">
              {attr.hint} · {100 - fracPct}% p/ próximo
            </div>
          </div>
        )
      })}
    </div>
  )
}
