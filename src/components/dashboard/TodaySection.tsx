"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getTodayLog } from "@/lib/daily-log"
import { getTodayNutritionLog, getNutritionGoal } from "@/lib/nutrition"
import { SkeletonCard } from "@/components/ui/Skeleton"

function DiaryTodayRow() {
  const [hasDiary, setHasDiary] = useState<boolean | null>(null)

  useEffect(() => {
    setHasDiary(getTodayLog() !== null)
  }, [])

  if (hasDiary === null) return <SkeletonCard height="64px" />

  return (
    <Link
      href="/diario"
      aria-label={hasDiary ? "Diário preenchido hoje — clique para editar" : "Preencher diário de hoje"}
      className={`card card--sm card--interactive flex items-center gap-3 no-underline${hasDiary ? " card--selected" : ""}`}
    >
      <span className="text-2xl" aria-hidden="true">📓</span>
      <div className="flex-1">
        <div className="text-sm font-bold" style={{ color: hasDiary ? "var(--color-accent)" : "var(--color-text-primary)" }}>
          {hasDiary ? "Diário preenchido hoje ✓" : "Preencher diário de hoje"}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {hasDiary ? "Clique para editar" : "+10 XP ao completar"}
        </div>
      </div>
      <span className="text-muted" aria-hidden="true">›</span>
    </Link>
  )
}

function NutritionTodayRow() {
  const [data, setData] = useState<{ calories: number; goal: number } | null>(null)

  useEffect(() => {
    const log = getTodayNutritionLog()
    const goal = getNutritionGoal()
    setData({ calories: log?.calories ?? 0, goal: goal.calories })
  }, [])

  if (data === null) return <SkeletonCard height="64px" />

  const pct = data.goal > 0 ? Math.min((data.calories / data.goal) * 100, 100) : 0
  const hasLog = data.calories > 0

  return (
    <Link
      href="/nutricao"
      aria-label={hasLog ? `${data.calories} kcal registradas` : "Registrar nutrição de hoje"}
      className="card card--sm card--interactive flex items-center gap-3 no-underline"
      style={hasLog ? { borderColor: "var(--color-info)", background: "var(--color-info-subtle)" } : undefined}
    >
      <span className="text-2xl" aria-hidden="true">🥗</span>
      <div className="min-w-0 flex-1">
        <div
          className="numeric text-sm font-bold"
          style={{ color: hasLog ? "var(--color-info)" : "var(--color-text-primary)", marginBottom: hasLog ? 4 : 2 }}
        >
          {hasLog ? `${data.calories} kcal registradas` : "Registrar nutrição de hoje"}
        </div>
        {hasLog ? (
          <div className="progress-track progress-track--thin">
            <div className="progress-fill progress-fill--info" style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <div className="text-xs text-muted">+15 XP ao completar</div>
        )}
      </div>
      <span className="text-muted" aria-hidden="true">›</span>
    </Link>
  )
}

export function TodaySection() {
  return (
    <section aria-label="Registros de hoje">
      <div className="section-label" style={{ marginBottom: "var(--space-2)" }}>Hoje</div>
      <div className="flex flex-col gap-2">
        <DiaryTodayRow />
        <NutritionTodayRow />
      </div>
    </section>
  )
}
