"use client"

const ILLUSTRATION_ICONS = ["🏋️", "💪", "🔥"]

type WorkoutEmptyStateProps = {
  onCreate: () => void
}

export function WorkoutEmptyState({ onCreate }: WorkoutEmptyStateProps) {
  return (
    <div className="workout-empty">
      <div className="workout-empty__icons" aria-hidden="true">
        {ILLUSTRATION_ICONS.map((icon) => (
          <span key={icon} className="workout-empty__icon">{icon}</span>
        ))}
      </div>
      <p className="workout-empty__title">Sua jornada começa com o primeiro treino</p>
      <p className="workout-empty__desc">
        Monte um treino personalizado com seus exercícios, metas de séries e repetições — e comece a ganhar XP.
      </p>
      <button type="button" className="btn btn--primary btn--lg" onClick={onCreate}>
        + Criar meu primeiro treino
      </button>
    </div>
  )
}
