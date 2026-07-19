"use client"

import { useId } from "react"
import { ModalShell } from "./ModalShell"

type StepperProps = {
  title: string
  steps: string[]
  currentStepIndex: number
  onClose: () => void
  dismissible?: boolean
  children: React.ReactNode
  footer: React.ReactNode
}

/**
 * Wizard genérico sobre ModalShell — sem precedente reutilizável no projeto
 * (OnboardingModal implementa seu próprio overlay ad hoc). Só cuida de
 * layout/progresso; o estado de cada passo e a navegação ficam com quem usa.
 */
export function Stepper({ title, steps, currentStepIndex, onClose, dismissible = true, children, footer }: StepperProps) {
  const titleId = useId()

  return (
    <ModalShell labelledBy={titleId} variant="sheet" dismissible={dismissible} onClose={onClose}>
      <div className="modal-header">
        <h2 id={titleId} className="modal-title">
          {title}
        </h2>
        {dismissible && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        )}
      </div>

      <ol className="stepper-progress" aria-label="Etapas">
        {steps.map((label, index) => {
          const state = index === currentStepIndex ? "current" : index < currentStepIndex ? "done" : "upcoming"
          return (
            <li key={label} className={`stepper-progress__step stepper-progress__step--${state}`}>
              <span className="stepper-progress__dot" aria-hidden="true" />
              <span className="stepper-progress__label">{label}</span>
            </li>
          )
        })}
      </ol>

      <div className="stepper-body">{children}</div>

      <div className="stepper-footer">{footer}</div>
    </ModalShell>
  )
}
