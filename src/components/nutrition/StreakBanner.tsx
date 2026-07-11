"use client"

const NUTRITIONIST_BADGE_STREAK = 7

type Props = {
  streak: number
}

export function StreakBanner({ streak }: Props) {
  if (streak <= 0) return null
  const remaining = NUTRITIONIST_BADGE_STREAK - streak

  return (
    <div className="streak-banner">
      <span className="streak-banner__icon" aria-hidden="true">🔥</span>
      <div>
        <div className="streak-banner__title">
          {streak} dia{streak !== 1 ? "s" : ""} consecutivo{streak !== 1 ? "s" : ""}!
        </div>
        <div className="streak-banner__desc">
          {streak >= NUTRITIONIST_BADGE_STREAK
            ? "Badge Nutricionista desbloqueado!"
            : `${remaining} dia${remaining !== 1 ? "s" : ""} para o badge Nutricionista`}
        </div>
      </div>
    </div>
  )
}
