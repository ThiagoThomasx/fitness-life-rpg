"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCharacterStore, xpProgress, xpToNextLevel } from "@/stores/useCharacterStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { isSupabaseConfigured } from "@/lib/env"
import { LastWorkout } from "@/components/dashboard/LastWorkout"
import { getDailyMissions, buildMissionsInput, type DailyMission } from "@/lib/daily-missions"
import { getWeeklyProgress, type WeeklyProgress } from "@/lib/weekly-progress"
import { getTodayLog } from "@/lib/daily-log"
import { getTodayNutritionLog, getNutritionGoal } from "@/lib/nutrition"
import { BADGE_DEFINITIONS } from "@/lib/badges"
import { LevelUpModal } from "@/components/ui/LevelUpModal"
import { SkeletonCard } from "@/components/ui/Skeleton"
import type { EarnedBadge } from "@/lib/badges"

const ATTRIBUTES = [
  { key: "strength" as const, label: "FOR", icon: "💪" },
  { key: "agility" as const, label: "AGI", icon: "⚡" },
  { key: "dexterity" as const, label: "DES", icon: "🎯" },
  { key: "constitution" as const, label: "CON", icon: "🛡️" },
  { key: "vitality" as const, label: "VIT", icon: "❤️" },
]

function MissionCard({ mission }: { mission: DailyMission }) {
  const isDone = mission.status === "done"
  const isLocked = mission.status === "locked"
  return (
    <div
      className="card card--sm"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        background: isDone ? "rgba(29,185,84,0.06)" : undefined,
        borderColor: isDone ? "rgba(29,185,84,0.2)" : undefined,
        opacity: isLocked ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: "1.375rem", flexShrink: 0 }} aria-hidden="true">{mission.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-semibold)",
          color: isDone ? "var(--color-accent)" : "var(--color-text-primary)",
        }}>
          {mission.title}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
          {mission.description}
        </div>
      </div>
      <div style={{
        fontSize: "0.7rem",
        fontWeight: "var(--font-bold)",
        color: isDone ? "var(--color-accent)" : "var(--color-text-muted)",
        flexShrink: 0,
      }}>
        {isDone ? "✓" : `+${mission.xpReward} XP`}
      </div>
    </div>
  )
}

function WeeklyCard({ progress }: { progress: WeeklyProgress }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 className="section-label" style={{ marginBottom: 0 }}>Semana atual</h3>
        <span style={{ fontSize: "0.7rem", color: "var(--color-accent)", fontWeight: "var(--font-bold)" }}>
          +{progress.totalXp} XP
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.375rem", marginBottom: "0.625rem" }}>
        {progress.days.map((day) => {
          const isToday = day.date === today
          return (
            <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
              <div
                aria-label={`${day.label}: ${day.hasWorkout ? "treino" : day.hasDiary ? "diário" : "sem atividade"}`}
                style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  background: day.hasWorkout
                    ? "var(--color-accent)"
                    : day.hasDiary
                    ? "rgba(29,185,84,0.25)"
                    : "rgba(255,255,255,0.04)",
                  border: isToday ? "2px solid var(--color-accent)" : "1px solid var(--color-border-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem",
                  transition: "background var(--duration-normal)",
                }}
              >
                {day.hasWorkout ? "💪" : day.hasDiary ? "📓" : ""}
              </div>
              <span style={{
                fontSize: "0.55rem",
                color: isToday ? "var(--color-text-primary)" : "var(--color-text-muted)",
                fontWeight: isToday ? "var(--font-bold)" : "var(--font-normal)",
              }}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          🏋️ {progress.workoutCount}/{progress.workoutTarget} treinos
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          📓 {progress.diaryCount} diários
        </span>
      </div>
    </section>
  )
}

function DiaryTodayCard() {
  const router = useRouter()
  const [hasDiary, setHasDiary] = useState<boolean | null>(null)

  useEffect(() => {
    setHasDiary(getTodayLog() !== null)
  }, [])

  if (hasDiary === null) return <SkeletonCard height="72px" />

  return (
    <section
      className="card card--interactive"
      onClick={() => router.push("/diario")}
      role="button"
      tabIndex={0}
      aria-label={hasDiary ? "Diário preenchido hoje — clique para editar" : "Preencher diário de hoje"}
      onKeyDown={(e) => e.key === "Enter" && router.push("/diario")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        background: hasDiary ? "rgba(29,185,84,0.06)" : undefined,
        borderColor: hasDiary ? "rgba(29,185,84,0.25)" : undefined,
      }}
    >
      <span style={{ fontSize: "1.75rem" }} aria-hidden="true">📓</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-bold)",
          color: hasDiary ? "var(--color-accent)" : "var(--color-text-primary)",
        }}>
          {hasDiary ? "Diário preenchido hoje ✓" : "Preencher diário de hoje"}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
          {hasDiary ? "Clique para editar" : "+10 XP ao completar"}
        </div>
      </div>
      <span style={{ color: "var(--color-text-muted)" }} aria-hidden="true">›</span>
    </section>
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
    <section
      className="card card--interactive"
      onClick={() => router.push("/nutricao")}
      role="button"
      tabIndex={0}
      aria-label={hasLog ? `${data?.calories} kcal registradas — clique para editar` : "Registrar nutrição de hoje"}
      onKeyDown={(e) => e.key === "Enter" && router.push("/nutricao")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        background: hasLog ? "rgba(59,130,246,0.06)" : undefined,
        borderColor: hasLog ? "rgba(59,130,246,0.25)" : undefined,
      }}
    >
      <span style={{ fontSize: "1.75rem", flexShrink: 0 }} aria-hidden="true">🥗</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-bold)",
          color: hasLog ? "#3b82f6" : "var(--color-text-primary)",
          marginBottom: "0.25rem",
        }}>
          {hasLog ? `${data?.calories} kcal registradas` : "Registrar nutrição de hoje"}
        </div>
        {hasLog ? (
          <div
            className="progress-track progress-track--thin"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemax={100}
            aria-label="Progresso calórico"
          >
            <div className="progress-fill" style={{ width: `${pct}%`, background: "#3b82f6" }} />
          </div>
        ) : (
          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>+15 XP ao completar</div>
        )}
      </div>
      <span style={{ color: "var(--color-text-muted)", flexShrink: 0 }} aria-hidden="true">›</span>
    </section>
  )
}

function RecentBadgesCard({ badges }: { badges: EarnedBadge[] }) {
  const recent = badges.slice(0, 4)
  if (recent.length === 0) return null

  return (
    <section className="card">
      <h3 className="section-label">Badges recentes</h3>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {recent.map((eb) => {
          const def = BADGE_DEFINITIONS.find((b) => b.id === eb.badgeId)
          if (!def) return null
          return (
            <div key={eb.badgeId} style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: "0.375rem", minWidth: 60,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--color-xp-muted)",
                border: "1px solid rgba(245,158,11,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.375rem",
              }}>
                {def.icon}
              </div>
              <span style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.2, maxWidth: 60 }}>
                {def.name}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

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
    <section className="card">
      <h3 className="section-label">Próximo marco</h3>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }} aria-hidden="true">{next.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-semibold)" }}>
              {next.label}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
              {totalWorkouts}/{next.at}
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={totalWorkouts}
            aria-valuemax={next.at}
            aria-label={`Progresso para ${next.label}`}
          >
            <div
              className="progress-fill progress-fill--accent"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const { earnedBadges, refreshBadges } = useBadgeStore()
  const [missions, setMissions] = useState<DailyMission[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null)
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
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
    setTotalWorkouts(input.totalWorkouts)
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
      {levelUpLevel && (
        <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
      )}

      <div className="page page--tight">
        {!isSupabaseConfigured && (
          <div className="alert-banner" role="status">
            Modo local — dados persistidos no navegador.
          </div>
        )}

        {/* 1. Character header */}
        <section className="card card--accent-top" style={{ paddingTop: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span className="badge-pill badge-pill--level">Nv {character.level}</span>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)", margin: 0 }}>
                {character.name}
              </h2>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: 0 }}>
                {Math.floor(character.current_xp)} / {needed} XP
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                XP Total
              </div>
              <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", color: "var(--color-xp)" }}>
                {Math.floor(character.total_xp).toLocaleString("pt-BR")}
              </div>
            </div>
          </div>

          <div
            className="progress-track"
            style={{ marginBottom: "1rem" }}
          >
            <div
              className="progress-fill progress-fill--accent"
              role="progressbar"
              aria-valuenow={character.current_xp}
              aria-valuemax={needed}
              aria-label="Progresso de XP"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem" }}>
            {ATTRIBUTES.map((attr) => {
              const raw = character[attr.key] as number
              const display = Math.floor(raw)
              const fractional = raw - Math.floor(raw)
              return (
                <div key={attr.key} style={{
                  background: "var(--color-bg-base)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 10,
                  padding: "0.5rem 0.375rem",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
                }}>
                  <span style={{ fontSize: "1rem" }} aria-hidden="true">{attr.icon}</span>
                  <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
                    {display}
                  </span>
                  <div
                    className="progress-track progress-track--thin"
                    style={{ width: "100%" }}
                    aria-hidden="true"
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${fractional * 100}%`, background: "var(--color-accent)" }}
                    />
                  </div>
                  <span style={{ fontSize: "0.55rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                    {attr.label}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* 2. Missions */}
        {!loaded ? (
          <SkeletonCard height="140px" />
        ) : missions.length > 0 ? (
          <section>
            <h3 className="section-label">Missões do dia</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {missions.map((m) => <MissionCard key={m.id} mission={m} />)}
            </div>
          </section>
        ) : null}

        {/* 3. Weekly progress */}
        {!loaded ? <SkeletonCard height="120px" /> : weeklyProgress ? <WeeklyCard progress={weeklyProgress} /> : null}

        {/* 4. Last workout */}
        <LastWorkout />

        {/* 5. Today cards */}
        <DiaryTodayCard />
        <NutritionTodayCard />

        {/* 6. Recent badges */}
        {earnedBadges.length > 0 && <RecentBadgesCard badges={earnedBadges} />}

        {/* 7. Next milestone */}
        <NextMilestoneCard totalWorkouts={totalWorkouts} />

        {/* CTAs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <button
            className="btn btn--primary btn--lg"
            onClick={() => router.push("/treinos")}
          >
            🏋️ Treinar agora
          </button>
          <button
            className="btn btn--ghost btn--lg"
            onClick={() => router.push("/diario")}
          >
            📓 Abrir diário
          </button>
        </div>
      </div>
    </>
  )
}
