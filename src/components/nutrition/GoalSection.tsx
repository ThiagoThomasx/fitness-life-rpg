"use client"

import { useState } from "react"
import type { NutritionGoal } from "@/lib/nutrition"
import { MACRO_COLORS } from "@/lib/theme-colors"
import { NumberInput } from "./NumberInput"

type Props = {
  goal: NutritionGoal
  onSave: (g: NutritionGoal) => void
}

export function GoalSection({ goal, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<NutritionGoal>(goal)

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  if (!editing) {
    const items = [
      { label: "Calorias", value: goal.calories, unit: "kcal", color: "var(--color-info)" },
      { label: "Proteína", value: goal.protein_g, unit: "g", color: MACRO_COLORS.protein },
      { label: "Carboidrato", value: goal.carbs_g, unit: "g", color: MACRO_COLORS.carbs },
      { label: "Gordura", value: goal.fat_g, unit: "g", color: MACRO_COLORS.fat },
    ]

    return (
      <section className="card">
        <div className="goal-section__header">
          <span className="section-label goal-section__label">Metas diárias</span>
          <button onClick={() => { setDraft(goal); setEditing(true) }} className="goal-section__edit">
            Editar
          </button>
        </div>
        <div className="goal-section__grid">
          {items.map(({ label, value, unit, color }) => (
            <div key={label} className="goal-stat">
              <span className="goal-stat__label">{label}</span>
              <span className="goal-stat__value" style={{ color }}>{value}</span>
              <span className="goal-stat__unit">{unit}</span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="section-label">Editar metas diárias</div>
      <div className="entry-form__body">
        <NumberInput label="Calorias (kcal)" value={draft.calories} onChange={(v) => setDraft({ ...draft, calories: v })} unit="kcal" min={500} max={6000} />
        <NumberInput label="Proteína (g)" value={draft.protein_g} onChange={(v) => setDraft({ ...draft, protein_g: v })} unit="g" />
        <NumberInput label="Carboidrato (g)" value={draft.carbs_g} onChange={(v) => setDraft({ ...draft, carbs_g: v })} unit="g" />
        <NumberInput label="Gordura (g)" value={draft.fat_g} onChange={(v) => setDraft({ ...draft, fat_g: v })} unit="g" />
        <div className="entry-form__actions">
          <button onClick={handleSave} className="btn btn--primary" style={{ flex: 1 }}>
            Salvar metas
          </button>
          <button onClick={() => setEditing(false)} className="btn btn--ghost" style={{ flex: 1 }}>
            Cancelar
          </button>
        </div>
      </div>
    </section>
  )
}
