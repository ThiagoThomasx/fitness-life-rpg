"use client"

const MILESTONES = [
  { at: 1, label: "Primeiro treino", icon: "🥇" },
  { at: 5, label: "5 treinos", icon: "🌟" },
  { at: 10, label: "10 treinos", icon: "💪" },
  { at: 30, label: "30 treinos", icon: "🔥" },
  { at: 50, label: "50 treinos", icon: "⚡" },
]

export function NextMilestone({ totalWorkouts }: { totalWorkouts: number }) {
  const next = MILESTONES.find((m) => m.at > totalWorkouts)
  if (!next) return null

  const pct = Math.min((totalWorkouts / next.at) * 100, 100)

  return (
    <section className="card" aria-label="Próximo marco">
      <div className="section-label">Próximo marco</div>
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">{next.icon}</span>
        <div className="flex-1">
          <div className="mb-1.5 flex justify-between">
            <span className="text-sm font-bold text-primary">{next.label}</span>
            <span className="numeric text-xs text-muted">{totalWorkouts}/{next.at}</span>
          </div>
          <div className="xp-bar">
            <div className="xp-bar__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}
