"use client"

import type { WorkoutReadinessResult, ReadinessLevel } from "@/lib/workout-readiness"

function levelLabel(level: ReadinessLevel): string {
  switch (level) {
    case "high": return "Prontidão alta"
    case "moderate": return "Prontidão moderada"
    case "low": return "Prontidão baixa"
    case "insufficient_data": return "Dados insuficientes"
  }
}

function levelClass(level: ReadinessLevel): string {
  switch (level) {
    case "high": return "readiness-card--high"
    case "moderate": return "readiness-card--moderate"
    case "low": return "readiness-card--low"
    case "insufficient_data": return "readiness-card--unknown"
  }
}

function impactIcon(impact: "positive" | "neutral" | "negative"): string {
  switch (impact) {
    case "positive": return "+"
    case "negative": return "−"
    case "neutral": return "·"
  }
}

function confidenceLabel(confidence: "low" | "medium" | "high"): string {
  switch (confidence) {
    case "high": return "Confiança alta"
    case "medium": return "Confiança média"
    case "low": return "Confiança baixa"
  }
}

interface Props {
  result: WorkoutReadinessResult
  onEditCheckIn?: () => void
}

export function ReadinessCard({ result, onEditCheckIn }: Props) {
  const positiveFactors = result.factors.filter((f) => f.impact === "positive")
  const negativeFactors = result.factors.filter((f) => f.impact === "negative")
  const topFactors = [...negativeFactors, ...positiveFactors].slice(0, 4)

  return (
    <div className={`readiness-card ${levelClass(result.level)}`} aria-label="Resultado de prontidão">
      <div className="readiness-card__header">
        <span className="readiness-card__level-badge">{levelLabel(result.level)}</span>
        <span className="readiness-card__confidence">{confidenceLabel(result.confidence)}</span>
      </div>

      <h3 className="readiness-card__headline">{result.headline}</h3>
      <p className="readiness-card__explanation">{result.explanation}</p>

      {topFactors.length > 0 && (
        <ul className="readiness-card__factors" aria-label="Fatores de prontidão">
          {topFactors.map((f) => (
            <li
              key={f.key}
              className={`readiness-card__factor readiness-card__factor--${f.impact}`}
            >
              <span className="readiness-card__factor-icon" aria-hidden="true">
                {impactIcon(f.impact)}
              </span>
              <span className="readiness-card__factor-text">
                <strong>{f.label}:</strong> {f.explanation}
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.suggestedAdjustments.length > 0 && (
        <div className="readiness-card__adjustments">
          <p className="readiness-card__adjustments-title">Sugestões para hoje:</p>
          <ul aria-label="Ajustes sugeridos">
            {result.suggestedAdjustments.map((a) => (
              <li key={a.type} className="readiness-card__adjustment">
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onEditCheckIn && (
        <button
          type="button"
          className="readiness-card__edit-btn"
          onClick={onEditCheckIn}
          aria-label="Editar check-in de prontidão"
        >
          Editar check-in
        </button>
      )}
    </div>
  )
}
