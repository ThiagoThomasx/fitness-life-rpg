"use client"

import { useId } from "react"

type Props = {
  label: string
  value: number
  onChange: (v: number) => void
  unit: string
  min?: number
  max?: number
}

export function NumberInput({ label, value, onChange, unit, min = 0, max = 9999 }: Props) {
  const inputId = useId()
  return (
    <div className="number-input">
      <label className="field-label" htmlFor={inputId}>{label}</label>
      <div className="number-input__control">
        <input
          id={inputId}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n) && n >= min && n <= max) onChange(n)
          }}
          className="number-input__field"
        />
        <span className="number-input__unit">{unit}</span>
      </div>
    </div>
  )
}
