"use client"

import type { DailyMission } from "@/lib/daily-missions"

/** Missões concluídas automaticamente pelo app (sem botão manual). */
const AUTO_MISSIONS = new Set(["diary-today", "workout-this-week", "workout-today", "sleep-7h", "mood-good"])

function MissionRow({ mission, onComplete }: { mission: DailyMission; onComplete: (id: string) => void }) {
  const isDone = mission.status === "done"
  const isLocked = mission.status === "locked"
  const canManualComplete = !isDone && !isLocked && !AUTO_MISSIONS.has(mission.id)

  return (
    <div
      className={`card card--sm flex items-center gap-3${isDone ? " card--selected" : ""}`}
      style={isLocked ? { opacity: 0.4 } : undefined}
    >
      <span className="flex-shrink-0 text-xl" aria-hidden="true">{mission.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold" style={{ color: isDone ? "var(--color-accent)" : "var(--color-text-primary)" }}>
          {mission.title}
          {isDone && <span aria-label="concluída"> ✓</span>}
        </div>
        <div className="mt-0.5 text-xs text-muted">{mission.description}</div>
      </div>
      {!isDone && (canManualComplete ? (
        <button
          onClick={() => onComplete(mission.id)}
          className="badge-pill badge-pill--accent numeric flex-shrink-0 cursor-pointer whitespace-nowrap"
          style={{ border: "1px solid var(--color-accent-border)", padding: "4px 12px" }}
        >
          +{mission.xpReward} XP
        </button>
      ) : (
        <span className="numeric flex-shrink-0 text-xs font-bold text-muted">+{mission.xpReward} XP</span>
      ))}
    </div>
  )
}

type Props = {
  missions: DailyMission[]
  onComplete: (id: string) => void
}

export function MissionsSection({ missions, onComplete }: Props) {
  if (missions.length === 0) return null

  const doneCount = missions.filter((m) => m.status === "done").length
  const availableCount = missions.filter((m) => m.status !== "locked").length

  return (
    <section aria-label="Missões do dia">
      <div className="mb-2 flex items-center justify-between">
        <div className="section-label" style={{ marginBottom: 0 }}>Missões do dia</div>
        <span className="numeric text-xs text-muted">{doneCount}/{availableCount} completas</span>
      </div>
      <div className="flex flex-col gap-2">
        {missions.map((mission) => (
          <MissionRow key={mission.id} mission={mission} onComplete={onComplete} />
        ))}
      </div>
    </section>
  )
}
