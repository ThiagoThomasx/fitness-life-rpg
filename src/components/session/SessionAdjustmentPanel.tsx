"use client"

import { useState } from "react"
import type { SessionAdjustment, SessionAdjustmentMode } from "@/lib/session-adjustments"
import {
  adjustmentModeLabel,
  buildAdjustmentSummary,
  isOriginalAdjustment,
  readinessToPreset,
  validateAdjustment,
} from "@/lib/session-adjustments"
import type { WorkoutReadinessResult } from "@/lib/workout-readiness"

type WeightReductionOption = 0 | 5 | 10 | 15
type SetsReductionOption = 0 | 1
type RestIncreaseOption = 0 | 15 | 30 | 45 | 60

type Props = {
  readinessResult: WorkoutReadinessResult | null
  adjustment: SessionAdjustment
  exerciseCount: number
  onApply: (adjustment: SessionAdjustment) => void
  onReset: () => void
}

export function SessionAdjustmentPanel({
  readinessResult,
  adjustment,
  exerciseCount,
  onApply,
  onReset,
}: Props) {
  const [showCustomize, setShowCustomize] = useState(false)
  const [customWeight, setCustomWeight] = useState<WeightReductionOption>(
    (adjustment.weightReductionPercentage as WeightReductionOption) ?? 0
  )
  const [customSets, setCustomSets] = useState<SetsReductionOption>(
    (adjustment.setsReduction as SetsReductionOption) ?? 0
  )
  const [customRest, setCustomRest] = useState<RestIncreaseOption>(
    (adjustment.restIncreaseSeconds as RestIncreaseOption) ?? 0
  )
  const [customDisableProgression, setCustomDisableProgression] = useState(
    adjustment.disableProgressionTargets
  )
  const [customTechnique, setCustomTechnique] = useState(adjustment.prioritizeTechnique)

  const isActive = !isOriginalAdjustment(adjustment)
  const summary = buildAdjustmentSummary(adjustment, exerciseCount)

  function handleApplySuggestion() {
    if (!readinessResult) return
    onApply(readinessToPreset(readinessResult.level))
    setShowCustomize(false)
  }

  function handleApplyCustom() {
    const validated = validateAdjustment({
      mode: "custom" as SessionAdjustmentMode,
      weightReductionPercentage: customWeight,
      setsReduction: customSets,
      restIncreaseSeconds: customRest,
      disableProgressionTargets: customDisableProgression,
      prioritizeTechnique: customTechnique,
      source: "manual",
      appliedAt: new Date().toISOString(),
    })
    onApply(validated)
    setShowCustomize(false)
  }

  function handleReset() {
    onReset()
    setCustomWeight(0)
    setCustomSets(0)
    setCustomRest(0)
    setCustomDisableProgression(false)
    setCustomTechnique(false)
    setShowCustomize(false)
  }

  function openCustomizeWithCurrent() {
    setCustomWeight((adjustment.weightReductionPercentage as WeightReductionOption) ?? 0)
    setCustomSets((adjustment.setsReduction as SetsReductionOption) ?? 0)
    setCustomRest((adjustment.restIncreaseSeconds as RestIncreaseOption) ?? 0)
    setCustomDisableProgression(adjustment.disableProgressionTargets)
    setCustomTechnique(adjustment.prioritizeTechnique)
    setShowCustomize(true)
  }

  // Only show suggestion panel when there's a non-high readiness result
  const hasSuggestion =
    readinessResult !== null &&
    (readinessResult.level === "low" || readinessResult.level === "moderate")

  return (
    <div className="adjustment-panel">
      <h3 className="adjustment-panel__title">Ajustar treino de hoje</h3>

      {!isActive ? (
        <div>
          <p className="adjustment-panel__status">
            Você está seguindo o plano original.
          </p>

          {hasSuggestion && (
            <div className="adjustment-panel__suggestion" role="region" aria-label="Sugestão de ajuste">
              <p className="adjustment-panel__suggestion-label">Sugestão para hoje:</p>
              <ul className="adjustment-panel__suggestion-list" aria-label="Ajustes sugeridos">
                {readinessResult!.suggestedAdjustments
                  .filter((a) => a.type !== "keep_plan")
                  .map((a) => (
                    <li key={a.type}>{a.label}</li>
                  ))}
              </ul>
            </div>
          )}

          <div className="adjustment-panel__actions">
            {hasSuggestion && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleApplySuggestion}
              >
                Aplicar sugestão
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCustomWeight(0)
                setCustomSets(0)
                setCustomRest(0)
                setCustomDisableProgression(false)
                setCustomTechnique(false)
                setShowCustomize(true)
              }}
            >
              Personalizar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="adjustment-panel__active" role="status" aria-label="Ajustes ativos">
            <span className="adjustment-panel__mode-badge">
              {adjustmentModeLabel(adjustment.mode)}
            </span>
            <ul className="adjustment-panel__active-list">
              {summary.messages.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>

          <div className="adjustment-panel__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={openCustomizeWithCurrent}
            >
              Editar ajustes
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm adjustment-panel__undo"
              onClick={handleReset}
            >
              Desfazer ajustes
            </button>
          </div>
        </div>
      )}

      {showCustomize && (
        <div className="adjustment-panel__customize" role="dialog" aria-label="Personalizar ajustes">
          <h4 className="adjustment-panel__customize-title">Personalizar ajustes</h4>

          <fieldset className="adjustment-panel__field">
            <legend>Redução de carga</legend>
            <div className="adjustment-panel__options" role="radiogroup" aria-label="Redução de carga">
              {([0, 5, 10, 15] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={customWeight === v}
                  className={`adjustment-panel__option${customWeight === v ? " adjustment-panel__option--active" : ""}`}
                  onClick={() => setCustomWeight(v)}
                >
                  {v === 0 ? "Sem redução" : `-${v}%`}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="adjustment-panel__field">
            <legend>Redução de séries</legend>
            <div className="adjustment-panel__options" role="radiogroup" aria-label="Redução de séries">
              {([0, 1] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={customSets === v}
                  className={`adjustment-panel__option${customSets === v ? " adjustment-panel__option--active" : ""}`}
                  onClick={() => setCustomSets(v)}
                >
                  {v === 0 ? "Sem redução" : "−1 série"}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="adjustment-panel__field">
            <legend>Descanso adicional</legend>
            <div className="adjustment-panel__options" role="radiogroup" aria-label="Descanso adicional">
              {([0, 15, 30, 45, 60] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={customRest === v}
                  className={`adjustment-panel__option${customRest === v ? " adjustment-panel__option--active" : ""}`}
                  onClick={() => setCustomRest(v)}
                >
                  {v === 0 ? "Normal" : `+${v}s`}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="adjustment-panel__toggles">
            <label className="adjustment-panel__toggle">
              <input
                type="checkbox"
                checked={customDisableProgression}
                onChange={(e) => setCustomDisableProgression(e.target.checked)}
                aria-label="Não perseguir progressão hoje"
              />
              <span>Não perseguir progressão hoje</span>
            </label>
            <label className="adjustment-panel__toggle">
              <input
                type="checkbox"
                checked={customTechnique}
                onChange={(e) => setCustomTechnique(e.target.checked)}
                aria-label="Priorizar técnica"
              />
              <span>Priorizar técnica</span>
            </label>
          </div>

          <div className="adjustment-panel__actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleApplyCustom}
            >
              Aplicar
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setShowCustomize(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
