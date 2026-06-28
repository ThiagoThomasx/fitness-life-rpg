"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCharacterStore, xpProgress, xpToNextLevel } from "@/stores/useCharacterStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { LastWorkout } from "@/components/dashboard/LastWorkout"
import { getDailyMissions, buildMissionsInput, completeMission, type DailyMission } from "@/lib/daily-missions"
import { getWeeklyProgress, type WeeklyProgress } from "@/lib/weekly-progress"
import { getWeeklyPlanProgress } from "@/lib/weekly-plan"
import type { WeeklyPlanProgress } from "@/types/planning"
import { getTodayLog } from "@/lib/daily-log"
import { getTodayNutritionLog, getNutritionGoal } from "@/lib/nutrition"
import { BADGE_DEFINITIONS } from "@/lib/badges"
import { LevelUpModal } from "@/components/ui/LevelUpModal"
import { SkeletonCard } from "@/components/ui/Skeleton"
import type { EarnedBadge } from "@/lib/badges"
import { getPreferences } from "@/lib/preferences"
import { getTodayRecommendation, type WorkoutRecommendation } from "@/lib/recommendations"
import { OnboardingModal } from "@/components/onboarding/OnboardingModal"

// ── tokens ─────────────────────────────────────────────────────
const C = {
  bg0: "#121212",
  bg1: "#1a1a1a",
  bg2: "#202020",
  bg3: "#282828",
  border: "rgba(255,255,255,0.06)",
  accent: "#1db954",
  accentHover: "#1ed760",
  accentMuted: "rgba(29,185,84,0.12)",
  gold: "#f59e0b",
  goldMuted: "rgba(245,158,11,0.12)",
  purple: "#8b5cf6",
  purpleMuted: "rgba(139,92,246,0.12)",
  blue: "#3b82f6",
  muted: "#6a6a6a",
  text: "#ffffff",
  sub: "#b3b3b3",
}

const ATTRIBUTES = [
  { key: "strength" as const, label: "FOR", icon: "💪", color: "#ef4444" },
  { key: "agility" as const, label: "AGI", icon: "⚡", color: C.gold },
  { key: "dexterity" as const, label: "DES", icon: "🎯", color: C.blue },
  { key: "constitution" as const, label: "CON", icon: "🛡️", color: C.purple },
  { key: "vitality" as const, label: "VIT", icon: "❤️", color: "#ec4899" },
]

const AUTO_MISSIONS = new Set(["diary-today", "workout-this-week", "workout-today", "sleep-7h", "mood-good"])

// ── greeting ────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

// ── hero section ───────────────────────────────────────────────
function HeroSection({
  character,
  progress,
  needed,
  weeklyProgress,
}: {
  character: typeof MOCK_CHARACTER
  progress: number
  needed: number
  weeklyProgress: WeeklyProgress | null
}) {
  return (
    <section style={{
      position: "relative",
      overflow: "hidden",
      borderRadius: 20,
      background: C.bg1,
      border: `1px solid ${C.border}`,
    }}>
      {/* Gradient backdrop */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(140deg, rgba(29,185,84,0.2) 0%, transparent 55%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        top: -60,
        right: -60,
        width: 200,
        height: 200,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(29,185,84,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: "1.5rem 1.25rem 1.25rem" }}>
        {/* Top row: greeting + avatar */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.65rem", color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              {getGreeting()}, herói
            </div>
            <h2 style={{ fontSize: "1.625rem", fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {character.name}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 6 }}>
              <span style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: C.purple,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 9999,
                padding: "2px 10px",
                letterSpacing: "0.04em",
              }}>
                Nv {character.level}
              </span>
              <span style={{ fontSize: "0.7rem", color: C.muted }}>
                {Math.floor(character.current_xp)} / {needed} XP
              </span>
            </div>
          </div>

          {/* Avatar */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, rgba(29,185,84,0.5), ${C.bg3})`,
            border: "1px solid rgba(29,185,84,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            flexShrink: 0,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
            ⚔️
          </div>
        </div>

        {/* XP progress bar */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Progresso XP</span>
            <span style={{ fontSize: "0.65rem", color: C.accent, fontWeight: 700 }}>{Math.round(progress * 100)}%</span>
          </div>
          <div style={{ height: 6, background: C.bg3, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${C.accent}, ${C.accentHover})`,
              borderRadius: 9999,
              transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>

        {/* Attributes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.375rem" }}>
          {ATTRIBUTES.map((attr) => {
            const raw = character[attr.key] as number
            const display = Math.floor(raw)
            const frac = raw - Math.floor(raw)
            return (
              <div key={attr.key} style={{
                background: C.bg3,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "0.5rem 0.25rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}>
                <span style={{ fontSize: "0.875rem" }}>{attr.icon}</span>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: C.text }}>{display}</span>
                <div style={{ width: "80%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${frac * 100}%`, background: attr.color, borderRadius: 9999 }} />
                </div>
                <span style={{ fontSize: "0.55rem", color: C.muted }}>{attr.label}</span>
              </div>
            )
          })}
        </div>

        {/* Week streak pills */}
        {weeklyProgress && (
          <div style={{
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {weeklyProgress.days.map((day) => {
                const isToday = day.date === new Date().toISOString().slice(0, 10)
                return (
                  <div key={day.date} style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: day.hasWorkout ? C.accent : day.hasDiary ? "rgba(29,185,84,0.25)" : C.bg3,
                    border: isToday ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.65rem",
                  }}>
                    {day.hasWorkout ? "💪" : day.hasDiary ? "📓" : ""}
                  </div>
                )
              })}
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.7rem", color: C.sub }}>
                🏋️ {weeklyProgress.workoutCount}/{weeklyProgress.workoutTarget}
              </span>
              <span style={{ fontSize: "0.7rem", color: C.accent, fontWeight: 700 }}>
                +{weeklyProgress.totalXp} XP
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── quick actions ──────────────────────────────────────────────
function QuickActions() {
  const router = useRouter()

  const actions = [
    { icon: "🏋️", label: "Treinar", href: "/treinos", color: C.accent, bg: C.accentMuted },
    { icon: "📓", label: "Diário", href: "/diario", color: C.gold, bg: C.goldMuted },
    { icon: "📊", label: "Insights", href: "/insights", color: C.purple, bg: C.purpleMuted },
    { icon: "🥗", label: "Nutrição", href: "/nutricao", color: C.blue, bg: "rgba(59,130,246,0.12)" },
    { icon: "📅", label: "Plano", href: "/plano", color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  ]

  return (
    <div style={{
      display: "flex",
      gap: "0.625rem",
      overflowX: "auto",
      paddingBottom: "2px",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    } as React.CSSProperties}>
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => router.push(a.href)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.875rem 1rem",
            background: a.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            cursor: "pointer",
            minWidth: 72,
            flexShrink: 0,
            transition: "transform 0.1s, border-color 0.15s",
          }}
        >
          <span style={{ fontSize: "1.375rem" }}>{a.icon}</span>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: a.color, whiteSpace: "nowrap" }}>{a.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── progress cards ─────────────────────────────────────────────
function ProgressCards({
  weeklyProgress,
  totalWorkouts,
  totalXp,
}: {
  weeklyProgress: WeeklyProgress | null
  totalWorkouts: number
  totalXp: number
}) {
  const cards = [
    {
      icon: "🏋️", label: "Treinos na semana",
      value: weeklyProgress ? `${weeklyProgress.workoutCount}/${weeklyProgress.workoutTarget}` : "–",
      color: C.accent, tint: C.accentMuted,
    },
    {
      icon: "⭐", label: "XP na semana",
      value: weeklyProgress ? `+${weeklyProgress.totalXp}` : "–",
      color: C.gold, tint: C.goldMuted,
    },
    {
      icon: "🎯", label: "Total de treinos",
      value: totalWorkouts,
      color: C.purple, tint: C.purpleMuted,
    },
    {
      icon: "⚡", label: "XP acumulado",
      value: Math.floor(totalXp).toLocaleString("pt-BR"),
      color: C.blue, tint: "rgba(59,130,246,0.12)",
    },
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "0.875rem",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: c.color, opacity: 0.7,
            borderRadius: "14px 14px 0 0",
          }} />
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: c.tint,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
          }}>
            {c.icon}
          </div>
          <div style={{ fontSize: "1.375rem", fontWeight: 800, color: C.text, lineHeight: 1 }}>
            {c.value}
          </div>
          <div style={{ fontSize: "0.6rem", color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── recommendation ─────────────────────────────────────────────
function RecommendationWidget({ rec }: { rec: WorkoutRecommendation }) {
  const router = useRouter()
  return (
    <section
      onClick={() => router.push("/treinos")}
      role="button"
      tabIndex={0}
      aria-label={`Treino recomendado: ${rec.workout.name}`}
      onKeyDown={(e) => e.key === "Enter" && router.push("/treinos")}
      style={{
        background: `linear-gradient(135deg, rgba(29,185,84,0.12), rgba(29,185,84,0.04))`,
        border: "1px solid rgba(29,185,84,0.25)",
        borderRadius: 16,
        padding: "1rem 1.25rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: C.accentMuted,
        border: "1px solid rgba(29,185,84,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.375rem",
        flexShrink: 0,
      }}>
        {rec.workout.workout_type.icon ?? "🏋️"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.6rem", color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          ✨ Recomendado para hoje
        </div>
        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: C.text, marginBottom: 2 }}>{rec.workout.name}</div>
        <div style={{ fontSize: "0.7rem", color: C.muted }}>{rec.reason} · ~{rec.workout.estimated_minutes}min</div>
      </div>
      <span style={{ color: C.accent, fontSize: "1.125rem" }}>›</span>
    </section>
  )
}

// ── missions ───────────────────────────────────────────────────
function MissionCard({ mission, onComplete }: { mission: DailyMission; onComplete?: (id: string) => void }) {
  const isDone = mission.status === "done"
  const isLocked = mission.status === "locked"
  const canManualComplete = !isDone && !isLocked && !AUTO_MISSIONS.has(mission.id)

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      background: isDone ? "rgba(29,185,84,0.06)" : C.bg2,
      border: `1px solid ${isDone ? "rgba(29,185,84,0.2)" : C.border}`,
      borderRadius: 12,
      padding: "0.75rem 1rem",
      opacity: isLocked ? 0.4 : 1,
    }}>
      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{mission.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "0.825rem",
          fontWeight: 700,
          color: isDone ? C.accent : C.text,
        }}>
          {mission.title}
        </div>
        <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 2 }}>
          {mission.description}
        </div>
      </div>
      {isDone ? (
        <span style={{ fontSize: "1rem", color: C.accent, flexShrink: 0 }}>✓</span>
      ) : canManualComplete ? (
        <button
          onClick={() => onComplete?.(mission.id)}
          style={{
            background: C.accentMuted,
            border: "1px solid rgba(29,185,84,0.3)",
            borderRadius: 9999,
            padding: "4px 12px",
            fontSize: "0.65rem",
            fontWeight: 700,
            color: C.accent,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          +{mission.xpReward} XP
        </button>
      ) : (
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: C.muted, flexShrink: 0 }}>
          +{mission.xpReward} XP
        </span>
      )}
    </div>
  )
}

// ── weekly plan widget ─────────────────────────────────────────
function WeeklyPlanWidget({ planProgress }: { planProgress: WeeklyPlanProgress }) {
  const router = useRouter()
  const { plan, actual, completionPct } = planProgress

  return (
    <section
      onClick={() => router.push("/plano")}
      role="button"
      tabIndex={0}
      aria-label="Ver plano semanal"
      onKeyDown={(e) => e.key === "Enter" && router.push("/plano")}
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "1.125rem 1.25rem",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Plano da semana</div>
          {plan.focus && (
            <div style={{ fontSize: "0.72rem", color: C.sub, fontStyle: "italic" }}>&ldquo;{plan.focus}&rdquo;</div>
          )}
        </div>
        <span style={{
          fontSize: "0.875rem",
          fontWeight: 800,
          color: completionPct >= 100 ? C.accent : C.gold,
          background: completionPct >= 100 ? C.accentMuted : C.goldMuted,
          border: `1px solid ${completionPct >= 100 ? "rgba(29,185,84,0.25)" : "rgba(245,158,11,0.25)"}`,
          borderRadius: 9999,
          padding: "3px 12px",
        }}>
          {completionPct}% {completionPct >= 100 ? "✅" : ""}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {[
          { icon: "💪", label: "Treinos", cur: actual.workouts, tgt: plan.goals.workouts },
          { icon: "📓", label: "Diário", cur: actual.diary, tgt: plan.goals.diary },
          { icon: "🥗", label: "Nutrição", cur: actual.nutrition, tgt: plan.goals.nutrition },
          { icon: "⚡", label: "Missões", cur: actual.missions, tgt: plan.goals.missions },
        ].map(({ icon, label, cur, tgt }) => {
          const pct = Math.min(Math.round((cur / Math.max(tgt, 1)) * 100), 100)
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.65rem", color: C.muted }}>{icon} {label}</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: pct >= 100 ? C.accent : C.muted }}>{cur}/{tgt}</span>
              </div>
              <div style={{ height: 4, borderRadius: 9999, background: C.bg3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 9999, background: pct >= 100 ? C.accent : C.purple, width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── today cards ────────────────────────────────────────────────
function DiaryTodayCard() {
  const router = useRouter()
  const [hasDiary, setHasDiary] = useState<boolean | null>(null)

  useEffect(() => {
    setHasDiary(getTodayLog() !== null)
  }, [])

  if (hasDiary === null) return <SkeletonCard height="72px" />

  return (
    <div
      onClick={() => router.push("/diario")}
      role="button"
      tabIndex={0}
      aria-label={hasDiary ? "Diário preenchido hoje — clique para editar" : "Preencher diário de hoje"}
      onKeyDown={(e) => e.key === "Enter" && router.push("/diario")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        background: hasDiary ? "rgba(29,185,84,0.06)" : C.bg2,
        border: `1px solid ${hasDiary ? "rgba(29,185,84,0.25)" : C.border}`,
        borderRadius: 14,
        padding: "0.875rem 1rem",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: "1.5rem" }}>📓</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.825rem", fontWeight: 700, color: hasDiary ? C.accent : C.text }}>
          {hasDiary ? "Diário preenchido hoje ✓" : "Preencher diário de hoje"}
        </div>
        <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 2 }}>
          {hasDiary ? "Clique para editar" : "+10 XP ao completar"}
        </div>
      </div>
      <span style={{ color: C.muted }}>›</span>
    </div>
  )
}

function NutritionTodayCard() {
  const router = useRouter()
  const [data, setData] = useState<{ calories: number; goal: number } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const log = getTodayNutritionLog()
    const goal = getNutritionGoal()
    setData({ calories: log?.calories ?? 0, goal: goal.calories })
    setReady(true)
  }, [])

  if (!ready) return <SkeletonCard height="72px" />

  const pct = data && data.goal > 0 ? Math.min((data.calories / data.goal) * 100, 100) : 0
  const hasLog = (data?.calories ?? 0) > 0

  return (
    <div
      onClick={() => router.push("/nutricao")}
      role="button"
      tabIndex={0}
      aria-label={hasLog ? `${data?.calories} kcal registradas` : "Registrar nutrição de hoje"}
      onKeyDown={(e) => e.key === "Enter" && router.push("/nutricao")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        background: hasLog ? "rgba(59,130,246,0.06)" : C.bg2,
        border: `1px solid ${hasLog ? "rgba(59,130,246,0.25)" : C.border}`,
        borderRadius: 14,
        padding: "0.875rem 1rem",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: "1.5rem" }}>🥗</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.825rem", fontWeight: 700, color: hasLog ? "#3b82f6" : C.text, marginBottom: hasLog ? 4 : 2 }}>
          {hasLog ? `${data?.calories} kcal registradas` : "Registrar nutrição de hoje"}
        </div>
        {hasLog ? (
          <div style={{ height: 4, background: C.bg3, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#3b82f6", borderRadius: 9999 }} />
          </div>
        ) : (
          <div style={{ fontSize: "0.68rem", color: C.muted }}>+15 XP ao completar</div>
        )}
      </div>
      <span style={{ color: C.muted }}>›</span>
    </div>
  )
}

// ── badges ─────────────────────────────────────────────────────
function RecentBadgesCard({ badges }: { badges: EarnedBadge[] }) {
  const recent = badges.slice(0, 4)
  if (recent.length === 0) return null

  return (
    <section style={{
      background: C.bg1,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "1.125rem 1.25rem",
    }}>
      <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.875rem" }}>
        Badges recentes
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {recent.map((eb) => {
          const def = BADGE_DEFINITIONS.find((b) => b.id === eb.badgeId)
          if (!def) return null
          return (
            <div key={eb.badgeId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem", minWidth: 60 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: C.goldMuted,
                border: "1px solid rgba(245,158,11,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.375rem",
              }}>
                {def.icon}
              </div>
              <span style={{ fontSize: "0.58rem", color: C.sub, textAlign: "center", lineHeight: 1.2, maxWidth: 60 }}>{def.name}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── milestone ──────────────────────────────────────────────────
function NextMilestoneCard({ totalWorkouts }: { totalWorkouts: number }) {
  const milestones = [
    { at: 1, label: "Primeiro treino", icon: "🥇" },
    { at: 5, label: "5 treinos", icon: "🌟" },
    { at: 10, label: "10 treinos", icon: "💪" },
    { at: 30, label: "30 treinos", icon: "🔥" },
    { at: 50, label: "50 treinos", icon: "⚡" },
  ]
  const next = milestones.find((m) => m.at > totalWorkouts)
  if (!next) return null

  const pct = (totalWorkouts / next.at) * 100

  return (
    <section style={{
      background: C.bg1,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "1.125rem 1.25rem",
    }}>
      <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.875rem" }}>
        Próximo marco
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{next.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 700, color: C.text }}>{next.label}</span>
            <span style={{ fontSize: "0.72rem", color: C.muted }}>{totalWorkouts}/{next.at}</span>
          </div>
          <div style={{ height: 6, background: C.bg3, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(pct, 100)}%`,
              background: `linear-gradient(90deg, ${C.accent}, ${C.accentHover})`,
              borderRadius: 9999,
            }} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const { earnedBadges, refreshBadges } = useBadgeStore()
  const [missions, setMissions] = useState<DailyMission[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null)
  const [planProgress, setPlanProgress] = useState<WeeklyPlanProgress | null>(null)
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [todayRec, setTodayRec] = useState<WorkoutRecommendation | null>(null)
  const router = useRouter()

  const prevLevel = typeof window !== "undefined"
    ? Number(localStorage.getItem("rpg_last_seen_level") ?? 0)
    : 0

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  useEffect(() => {
    const input = buildMissionsInput()
    setMissions(getDailyMissions(input))
    setWeeklyProgress(getWeeklyProgress())
    setPlanProgress(getWeeklyPlanProgress())
    setTotalWorkouts(input.totalWorkouts)
    const prefs = getPreferences()
    if (!prefs.onboardingCompleted) {
      setShowOnboarding(true)
    } else {
      setTodayRec(getTodayRecommendation(prefs))
    }
    setLoaded(true)
  }, [])

  const character = storeCharacter ?? MOCK_CHARACTER
  const needed = xpToNextLevel(character.level)
  const progress = xpProgress(character)

  useEffect(() => {
    if (prevLevel > 0 && character.level > prevLevel) {
      setLevelUpLevel(character.level)
    }
    if (character.level > 0) {
      localStorage.setItem("rpg_last_seen_level", String(character.level))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.level])

  return (
    <>
      {levelUpLevel && <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />}
      {showOnboarding && (
        <OnboardingModal onComplete={() => {
          setShowOnboarding(false)
          const prefs = getPreferences()
          setTodayRec(getTodayRecommendation(prefs))
        }} />
      )}

      <div style={{
        padding: "1rem",
        paddingBottom: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
        maxWidth: 720,
        margin: "0 auto",
      }}>
        {/* 1. Hero */}
        <HeroSection
          character={character}
          progress={progress}
          needed={needed}
          weeklyProgress={weeklyProgress}
        />

        {/* 2. Quick actions */}
        <QuickActions />

        {/* 3. Progress cards */}
        {!loaded ? (
          <SkeletonCard height="160px" />
        ) : (
          <ProgressCards
            weeklyProgress={weeklyProgress}
            totalWorkouts={totalWorkouts}
            totalXp={character.total_xp}
          />
        )}

        {/* 4. Recommendation */}
        {todayRec && <RecommendationWidget rec={todayRec} />}

        {/* 5. Missions */}
        {!loaded ? (
          <SkeletonCard height="140px" />
        ) : missions.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
              <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
                Missões do dia
              </div>
              <span style={{ fontSize: "0.65rem", color: C.muted }}>
                {missions.filter((m) => m.status === "done").length}/{missions.filter((m) => m.status !== "locked").length} completas
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {missions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  onComplete={(id) => {
                    completeMission(id)
                    const input = buildMissionsInput()
                    setMissions(getDailyMissions(input))
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* 6. Weekly plan */}
        {planProgress && <WeeklyPlanWidget planProgress={planProgress} />}

        {/* 7. Last workout */}
        <LastWorkout />

        {/* 8. Today: diary + nutrition as track rows */}
        <section style={{
          background: C.bg1,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: "hidden",
        }}>
          <div style={{ padding: "1rem 1.25rem 0.625rem" }}>
            <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              Hoje
            </div>
          </div>
          <div style={{ padding: "0 0.75rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <DiaryTodayCard />
            <NutritionTodayCard />
          </div>
        </section>

        {/* 9. Badges */}
        {earnedBadges.length > 0 && <RecentBadgesCard badges={earnedBadges} />}

        {/* 10. Milestone */}
        <NextMilestoneCard totalWorkouts={totalWorkouts} />

        {/* 11. CTA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <button
            onClick={() => router.push("/treinos")}
            style={{
              padding: "0.875rem",
              background: C.accent,
              color: "#000",
              fontWeight: 800,
              fontSize: "0.875rem",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            🏋️ Treinar agora
          </button>
          <button
            onClick={() => router.push("/diario")}
            style={{
              padding: "0.875rem",
              background: C.bg2,
              color: C.text,
              fontWeight: 700,
              fontSize: "0.875rem",
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              cursor: "pointer",
            }}
          >
            📓 Abrir diário
          </button>
        </div>
      </div>
    </>
  )
}
