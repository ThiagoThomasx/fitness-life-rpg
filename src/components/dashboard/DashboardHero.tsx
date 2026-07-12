"use client"

import type { MOCK_CHARACTER } from "@/lib/mock/data"
import type { WeeklyProgress } from "@/lib/weekly-progress"
import { attributeColor } from "@/lib/theme-colors"
import { getGreeting } from "@/lib/greeting"

const ATTRIBUTES = [
  { key: "strength" as const, label: "FOR" },
  { key: "agility" as const, label: "AGI" },
  { key: "dexterity" as const, label: "DES" },
  { key: "constitution" as const, label: "CON" },
  { key: "vitality" as const, label: "VIT" },
]

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"]

function weekdayInitial(isoDate: string): string {
  const day = new Date(isoDate + "T12:00:00").getDay()
  return WEEKDAY_INITIALS[day] ?? ""
}

type Props = {
  character: typeof MOCK_CHARACTER
  progress: number
  needed: number
  weeklyProgress: WeeklyProgress | null
}

export function DashboardHero({ character, progress, needed, weeklyProgress }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <section className="card">
      {/* Saudação + nome + nível */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="section-label" style={{ marginBottom: "var(--space-1)" }}>
            {getGreeting()}
          </div>
          <h1 className="display-heading text-3xl truncate">{character.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="badge-pill badge-pill--level">Nv {character.level}</span>
            <span className="numeric text-xs text-muted">
              {Math.floor(character.current_xp)} / {needed} XP
            </span>
          </div>
        </div>
        <div
          className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-card"
          style={{ background: "var(--color-deep-forest)" }}
          aria-label={`Nível ${character.level}`}
        >
          <span className="numeric text-xl font-bold" style={{ color: "var(--color-accent)" }}>
            {character.level}
          </span>
          <span className="text-[0.55rem] uppercase tracking-wider" style={{ color: "var(--color-accent)", opacity: 0.7 }}>
            nível
          </span>
        </div>
      </div>

      {/* Barra de XP */}
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between">
          <span className="text-xs uppercase tracking-wide text-muted">Progresso XP</span>
          <span className="numeric text-xs font-bold" style={{ color: "var(--color-accent)" }}>
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="xp-bar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso de XP até o próximo nível">
          <div className="xp-bar__fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Atributos */}
      <div className="mt-5 grid grid-cols-5 gap-1.5">
        {ATTRIBUTES.map((attr) => {
          const raw = character[attr.key] as number
          const display = Math.floor(raw)
          const frac = raw - display
          const color = attributeColor(attr.key)
          return (
            <div
              key={attr.key}
              className="flex flex-col items-center gap-1 rounded-control border border-subtle bg-surface-raised px-1 py-2"
            >
              <span className="numeric text-base font-bold text-primary">{display}</span>
              <div className="progress-track progress-track--thin w-4/5">
                <div className="progress-fill" style={{ width: `${frac * 100}%`, background: color.fill }} />
              </div>
              <span className="text-[0.55rem] font-semibold tracking-wider text-muted">{attr.label}</span>
            </div>
          )
        })}
      </div>

      {/* Semana atual */}
      {weeklyProgress && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-subtle pt-4">
          <div className="flex gap-1" aria-label="Atividade da semana">
            {weeklyProgress.days.map((day) => {
              const isToday = day.date === today
              const status = day.hasWorkout ? "treino" : day.hasDiary ? "diário" : "sem registro"
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${status}`}
                  className="numeric flex h-7 w-7 items-center justify-center rounded-control text-[0.65rem] font-semibold"
                  style={{
                    background: day.hasWorkout
                      ? "var(--color-accent)"
                      : day.hasDiary
                        ? "var(--color-accent-subtle)"
                        : "var(--color-surface-raised)",
                    color: day.hasWorkout
                      ? "var(--color-text-on-accent)"
                      : day.hasDiary
                        ? "var(--color-accent)"
                        : "var(--color-text-muted)",
                    border: isToday
                      ? "2px solid var(--color-accent)"
                      : "1px solid var(--color-border-subtle)",
                  }}
                >
                  {weekdayInitial(day.date)}
                </div>
              )
            })}
          </div>
          <div className="flex flex-shrink-0 gap-3">
            <span className="numeric text-xs text-secondary">
              {weeklyProgress.workoutCount}/{weeklyProgress.workoutTarget} treinos
            </span>
            <span className="numeric text-xs font-bold" style={{ color: "var(--color-accent)" }}>
              +{weeklyProgress.totalXp} XP
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
