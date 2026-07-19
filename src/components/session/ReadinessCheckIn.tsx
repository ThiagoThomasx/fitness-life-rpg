"use client"

import { useState } from "react"
import type { WorkoutReadinessCheckIn } from "@/lib/readiness-check-ins"

interface Props {
  workoutId?: string
  onSubmit: (checkIn: WorkoutReadinessCheckIn) => void
  onSkip: () => void
}

type RatingKey = "energy" | "soreness" | "sleepQuality" | "motivation"
type WellnessRatingKey = "stress" | "mood"

const FIELDS: {
  key: RatingKey
  label: string
  lowLabel: string
  highLabel: string
}[] = [
  { key: "energy", label: "Energia", lowLabel: "Muito baixa", highLabel: "Muito boa" },
  { key: "soreness", label: "Dor muscular", lowLabel: "Nenhuma", highLabel: "Muito alta" },
  { key: "sleepQuality", label: "Qualidade do sono", lowLabel: "Muito ruim", highLabel: "Excelente" },
  { key: "motivation", label: "Motivação", lowLabel: "Muito baixa", highLabel: "Muito alta" },
]

// Sprint 19: campos opcionais de bem-estar — não pré-preenchidos, para não
// forçar uma resposta que o usuário talvez não queira dar no check-in rápido.
const WELLNESS_FIELDS: {
  key: WellnessRatingKey
  label: string
  lowLabel: string
  highLabel: string
}[] = [
  { key: "stress", label: "Estresse", lowLabel: "Nenhum", highLabel: "Muito alto" },
  { key: "mood", label: "Humor", lowLabel: "Muito baixo", highLabel: "Muito bom" },
]

type Ratings = Record<RatingKey, 1 | 2 | 3 | 4 | 5>
type WellnessRatings = Partial<Record<WellnessRatingKey, 1 | 2 | 3 | 4 | 5>>

const DEFAULT_RATINGS: Ratings = {
  energy: 3,
  soreness: 2,
  sleepQuality: 3,
  motivation: 3,
}

export function ReadinessCheckIn({ workoutId, onSubmit, onSkip }: Props) {
  const [ratings, setRatings] = useState<Ratings>(DEFAULT_RATINGS)
  const [wellness, setWellness] = useState<WellnessRatings>({})
  const [showWellness, setShowWellness] = useState(false)
  const [notes, setNotes] = useState("")

  function setRating(key: RatingKey, value: 1 | 2 | 3 | 4 | 5) {
    setRatings((prev) => ({ ...prev, [key]: value }))
  }

  function setWellnessRating(key: WellnessRatingKey, value: 1 | 2 | 3 | 4 | 5) {
    setWellness((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    const checkIn: WorkoutReadinessCheckIn = {
      id: `ci-${Date.now()}`,
      workoutId,
      createdAt: new Date().toISOString(),
      energy: ratings.energy,
      soreness: ratings.soreness,
      sleepQuality: ratings.sleepQuality,
      motivation: ratings.motivation,
      stress: wellness.stress,
      mood: wellness.mood,
      notes: notes.trim() || undefined,
    }
    onSubmit(checkIn)
  }

  return (
    <div className="readiness-checkin">
      <h2 className="readiness-checkin__title">Como você está hoje?</h2>
      <p className="readiness-checkin__subtitle">
        Responda em segundos para receber orientação personalizada.
      </p>

      <div className="readiness-checkin__fields">
        {FIELDS.map(({ key, label, lowLabel, highLabel }) => (
          <fieldset key={key} className="readiness-checkin__field">
            <legend className="readiness-checkin__field-label">{label}</legend>
            <div className="readiness-checkin__scale-labels">
              <span className="readiness-checkin__scale-low">{lowLabel}</span>
              <span className="readiness-checkin__scale-high">{highLabel}</span>
            </div>
            <div
              className="readiness-checkin__buttons"
              role="radiogroup"
              aria-label={label}
            >
              {([1, 2, 3, 4, 5] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={ratings[key] === v}
                  className={`readiness-checkin__btn${ratings[key] === v ? " readiness-checkin__btn--active" : ""}`}
                  onClick={() => setRating(key, v)}
                  aria-label={`${label}: ${v}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowWellness((v) => !v)}
        className="btn btn--ghost"
        style={{ width: "100%", marginBottom: "0.75rem" }}
      >
        {showWellness ? "Ocultar bem-estar ▲" : "Adicionar bem-estar (opcional) ▼"}
      </button>

      {showWellness && (
        <div className="readiness-checkin__fields">
          {WELLNESS_FIELDS.map(({ key, label, lowLabel, highLabel }) => (
            <fieldset key={key} className="readiness-checkin__field">
              <legend className="readiness-checkin__field-label">{label}</legend>
              <div className="readiness-checkin__scale-labels">
                <span className="readiness-checkin__scale-low">{lowLabel}</span>
                <span className="readiness-checkin__scale-high">{highLabel}</span>
              </div>
              <div
                className="readiness-checkin__buttons"
                role="radiogroup"
                aria-label={label}
              >
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={wellness[key] === v}
                    className={`readiness-checkin__btn${wellness[key] === v ? " readiness-checkin__btn--active" : ""}`}
                    onClick={() => setWellnessRating(key, v)}
                    aria-label={`${label}: ${v}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className="readiness-checkin__notes">
        <label htmlFor="checkin-notes" className="readiness-checkin__notes-label">
          Observação (opcional)
        </label>
        <textarea
          id="checkin-notes"
          className="readiness-checkin__notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: dormiu tarde, perna cansada..."
          rows={2}
          maxLength={200}
        />
      </div>

      <div className="readiness-checkin__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSubmit}
        >
          Avaliar prontidão
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onSkip}
        >
          Pular check-in
        </button>
      </div>
    </div>
  )
}
