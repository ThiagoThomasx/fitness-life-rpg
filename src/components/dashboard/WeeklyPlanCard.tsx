"use client"

import Link from "next/link"
import type { WeeklyPlanProgress } from "@/types/planning"

export function WeeklyPlanCard({ planProgress }: { planProgress: WeeklyPlanProgress }) {
  const { plan, actual, completionPct } = planProgress
  const isComplete = completionPct >= 100

  const goals = [
    { label: "Treinos", cur: actual.workouts, tgt: plan.goals.workouts },
    { label: "Diário", cur: actual.diary, tgt: plan.goals.diary },
    { label: "Nutrição", cur: actual.nutrition, tgt: plan.goals.nutrition },
    { label: "Missões", cur: actual.missions, tgt: plan.goals.missions },
  ]

  return (
    <Link href="/plano" aria-label="Ver plano semanal" className="card card--interactive block no-underline">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="section-label" style={{ marginBottom: 2 }}>Plano da semana</div>
          {plan.focus && (
            <div className="truncate text-xs italic text-secondary">&ldquo;{plan.focus}&rdquo;</div>
          )}
        </div>
        <span className={`badge-pill numeric flex-shrink-0 ${isComplete ? "badge-pill--accent" : "badge-pill--streak"}`} style={{ padding: "3px 12px", fontSize: "var(--text-sm)" }}>
          {completionPct}%{isComplete ? " ✓" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {goals.map(({ label, cur, tgt }) => {
          const pct = Math.min(Math.round((cur / Math.max(tgt, 1)) * 100), 100)
          return (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs text-muted">{label}</span>
                <span
                  className="numeric text-xs font-bold"
                  style={{ color: pct >= 100 ? "var(--color-accent)" : "var(--color-text-muted)" }}
                >
                  {cur}/{tgt}
                </span>
              </div>
              <div className="progress-track progress-track--thin">
                <div
                  className={`progress-fill ${pct >= 100 ? "progress-fill--accent" : "progress-fill--level"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Link>
  )
}
