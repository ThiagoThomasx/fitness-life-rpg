"use client"

import { useId, useState } from "react"

const FALLBACK_WEIGHT = "60"
const FALLBACK_REPS = "10"

type AddSetFormProps = {
  onAdd: (weight: number, reps: number) => void
  defaultWeight?: number | null
  defaultReps?: number
}

export function AddSetForm({ onAdd, defaultWeight, defaultReps }: AddSetFormProps) {
  const fieldId = useId()
  const [weight, setWeight] = useState(defaultWeight ? String(defaultWeight) : FALLBACK_WEIGHT)
  const [reps, setReps] = useState(defaultReps ? String(defaultReps) : FALLBACK_REPS)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedWeight = parseFloat(weight)
    const parsedReps = parseInt(reps, 10)
    if (isNaN(parsedWeight) || isNaN(parsedReps) || parsedWeight <= 0 || parsedReps <= 0) return
    onAdd(parsedWeight, parsedReps)
  }

  return (
    <form onSubmit={handleSubmit} className="add-set-form">
      <div>
        <label className="field-label" htmlFor={`${fieldId}-weight`}>Peso (kg)</label>
        <input
          id={`${fieldId}-weight`}
          className="input"
          type="number"
          min="0"
          step="0.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          inputMode="decimal"
        />
      </div>
      <div>
        <label className="field-label" htmlFor={`${fieldId}-reps`}>Reps</label>
        <input
          id={`${fieldId}-reps`}
          className="input"
          type="number"
          min="1"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          inputMode="numeric"
        />
      </div>
      <button type="submit" className="btn btn--primary">
        + Série
      </button>
    </form>
  )
}
