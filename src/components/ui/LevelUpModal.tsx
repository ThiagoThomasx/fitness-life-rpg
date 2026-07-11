"use client"

import { useId } from "react"
import { ModalShell } from "@/components/ui/ModalShell"

type Props = {
  level: number
  onClose: () => void
}

export function LevelUpModal({ level, onClose }: Props) {
  const titleId = useId()

  return (
    <ModalShell labelledBy={titleId} onClose={onClose}>
      <div className="levelup">
        <div className="levelup__icon" aria-hidden="true">
          ⭐
        </div>
        <div className="levelup__eyebrow">Level up!</div>
        <h2 id={titleId} className="levelup__number">
          Nível {level}
        </h2>
        <p className="levelup__message">
          Você alcançou o nível {level}.
          <br />
          Continue treinando!
        </p>
        <button type="button" className="btn btn--primary btn--full btn--lg" onClick={onClose}>
          Continuar
        </button>
      </div>
    </ModalShell>
  )
}
