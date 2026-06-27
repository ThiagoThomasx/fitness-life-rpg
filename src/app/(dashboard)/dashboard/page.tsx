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
import { BADGE_DEFINITIONS } from "@/lib/badges"
import type { EarnedBadge } from "@/lib/badges"

const ATTRIBUTES = [
  { key: "strength" as const, label: "FOR", icon: "💪" },
  { key: "agility" as const, label: "AGI", icon: "⚡" },
  { key: "dexterity" as const, label: "DES", icon: "🎯" },
  { key: "constitution" as const, label: "CON", icon: "🛡️" },
  { key: "vitality" as const, label: "VIT", icon: "❤️" },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: "0.7rem",
      color: "#6a6a6a",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 700,
      marginBottom: "0.625rem",
    }}>
      {children}
    </h3>
  )
}

function MissionCard({ mission }: { mission: DailyMission }) {
  const isDone = mission.status === "done"
  const isLocked = mission.status === "locked"
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      background: isDone ? "rgba(29,185,84,0.06)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isDone ? "rgba(29,185,84,0.2)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 12,
      padding: "0.75rem 1rem",
      opacity: isLocked ? 0.4 : 1,
    }}>
      <span style={{ fontSize: "1.375rem", flexShrink: 0 }}>{mission.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: isDone ? "#1db954" : "#ffffff" }}>
          {mission.title}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#6a6a6a", marginTop: 2 }}>
          {mission.description}
        </div>
      </div>
      <div style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        color: isDone ? "#1db954" : "#6a6a6a",
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
    <section style={{
      background: "#181818",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "1rem 1.25rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <SectionLabel>Semana atual</SectionLabel>
        <span style={{ fontSize: "0.7rem", color: "#1db954", fontWeight: 700 }}>
          +{progress.totalXp} XP
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.375rem", marginBottom: "0.625rem" }}>
        {progress.days.map((day) => {
          const isToday = day.date === today
          return (
            <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: day.hasWorkout
                  ? "#1db954"
                  : day.hasDiary
                  ? "rgba(29,185,84,0.25)"
                  : "rgba(255,255,255,0.04)",
                border: isToday ? "2px solid #1db954" : "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
              }}>
                {day.hasWorkout ? "💪" : day.hasDiary ? "📓" : ""}
              </div>
              <span style={{
                fontSize: "0.55rem",
                color: isToday ? "#ffffff" : "#6a6a6a",
                fontWeight: isToday ? 700 : 400,
              }}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <span style={{ fontSize: "0.75rem", color: "#b3b3b3" }}>
          🏋️ {progress.workoutCount}/{progress.workoutTarget} treinos
        </span>
        <span style={{ fontSize: "0.75rem", color: "#b3b3b3" }}>
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

  if (hasDiary === null) return null

  return (
    <section
      onClick={() => router.push("/diario")}
      style={{
        background: hasDiary ? "rgba(29,185,84,0.06)" : "#181818",
        border: `1px solid ${hasDiary ? "rgba(29,185,84,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 16,
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: "1.75rem" }}>📓</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: hasDiary ? "#1db954" : "#ffffff" }}>
          {hasDiary ? "Diário preenchido hoje ✓" : "Preencher diário de hoje"}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#6a6a6a", marginTop: 2 }}>
          {hasDiary ? "Clique para editar" : `+10 XP ao completar`}
        </div>
      </div>
      <span style={{ color: "#6a6a6a", fontSize: "0.875rem" }}>›</span>
    </section>
  )
}

function RecentBadgesCard({ badges }: { badges: EarnedBadge[] }) {
  const recent = badges.slice(0, 4)
  if (recent.length === 0) return null

  return (
    <section style={{
      background: "#181818",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "1rem 1.25rem",
    }}>
      <SectionLabel>Badges recentes</SectionLabel>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {recent.map((eb) => {
          const def = BADGE_DEFINITIONS.find((b) => b.id === eb.badgeId)
          if (!def) return null
          return (
            <div key={eb.badgeId} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.375rem",
              minWidth: 60,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.375rem",
              }}>
                {def.icon}
              </div>
              <span style={{ fontSize: "0.6rem", color: "#b3b3b3", textAlign: "center", lineHeight: 1.2, maxWidth: 60 }}>
                {def.name}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function NextMilestoneCard({ totalWorkouts }: { totalWorkouts: number; level: number }) {
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
      background: "#181818",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "1rem 1.25rem",
    }}>
      <SectionLabel>Próximo marco</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{next.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#ffffff", fontWeight: 600 }}>{next.label}</span>
            <span style={{ fontSize: "0.7rem", color: "#6a6a6a" }}>{totalWorkouts}/{next.at}</span>
          </div>
          <div style={{ height: 4, background: "#282828", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(pct, 100)}%`,
              background: "linear-gradient(90deg, #1db954, #f59e0b)",
              borderRadius: 9999,
              transition: "width 0.5s ease",
            }} />
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
  const router = useRouter()

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  useEffect(() => {
    const input = buildMissionsInput()
    setMissions(getDailyMissions(input))
    setWeeklyProgress(getWeeklyProgress())
    setTotalWorkouts(input.totalWorkouts)
  }, [])

  const character = storeCharacter ?? MOCK_CHARACTER
  const needed = xpToNextLevel(character.level)
  const progress = xpProgress(character)

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem", maxWidth: 600, margin: "0 auto" }}>
      {!isSupabaseConfigured && (
        <div style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 8,
          padding: "0.5rem 0.875rem",
          fontSize: "0.7rem",
          color: "#f59e0b",
        }}>
          Modo local — dados persistidos no navegador.
        </div>
      )}

      {/* 1. Header do personagem */}
      <section style={{
        background: "#181818",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "1.25rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #1db954, #f59e0b)",
        }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginTop: 4, marginBottom: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{
              display: "inline-flex", alignItems: "center",
              background: "rgba(139,92,246,0.15)", color: "#8b5cf6",
              fontSize: "0.7rem", fontWeight: 700, padding: "2px 0.5rem",
              borderRadius: 9999, width: "fit-content",
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              Nv {character.level}
            </span>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>{character.name}</h2>
            <p style={{ fontSize: "0.8rem", color: "#a7a7a7", margin: 0 }}>
              {Math.floor(character.current_xp)} / {needed} XP
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.65rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>XP Total</div>
            <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#f59e0b" }}>
              {Math.floor(character.total_xp).toLocaleString("pt-BR")}
            </div>
          </div>
        </div>

        <div style={{ height: 5, background: "#282828", borderRadius: 9999, overflow: "hidden", marginBottom: "1rem" }}>
          <div
            role="progressbar"
            aria-valuenow={character.current_xp}
            aria-valuemax={needed}
            aria-label="Progresso de XP"
            style={{
              height: "100%", width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #1db954, #f59e0b)",
              borderRadius: 9999, transition: "width 0.5s ease",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem" }}>
          {ATTRIBUTES.map((attr) => {
            const raw = character[attr.key] as number
            const display = Math.floor(raw)
            const fractional = raw - Math.floor(raw)
            return (
              <div key={attr.key} style={{
                background: "#121212",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 10,
                padding: "0.5rem 0.375rem",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
              }}>
                <span style={{ fontSize: "1rem" }}>{attr.icon}</span>
                <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>{display}</span>
                <div style={{ width: "100%", height: 2, background: "#282828", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${fractional * 100}%`, background: "#1db954", borderRadius: 9999 }} />
                </div>
                <span style={{ fontSize: "0.55rem", color: "#6a6a6a", textAlign: "center" }}>{attr.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 2. Missões do dia */}
      {missions.length > 0 && (
        <section>
          <SectionLabel>Missões do dia</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {missions.map((m) => <MissionCard key={m.id} mission={m} />)}
          </div>
        </section>
      )}

      {/* 3. Progresso semanal */}
      {weeklyProgress && <WeeklyCard progress={weeklyProgress} />}

      {/* 4. Último treino */}
      <LastWorkout />

      {/* 5. Diário de hoje */}
      <DiaryTodayCard />

      {/* 6. Badges recentes */}
      {earnedBadges.length > 0 && <RecentBadgesCard badges={earnedBadges} />}

      {/* 7. Próximo marco */}
      <NextMilestoneCard totalWorkouts={totalWorkouts} level={character.level} />

      {/* CTAs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <button
          onClick={() => router.push("/treinos")}
          style={{
            background: "#1db954", color: "#000", border: "none",
            borderRadius: 12, padding: "0.875rem", fontWeight: 800,
            fontSize: "0.875rem", cursor: "pointer",
          }}
        >
          🏋️ Treinar agora
        </button>
        <button
          onClick={() => router.push("/diario")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "0.875rem", fontWeight: 700,
            fontSize: "0.875rem", cursor: "pointer", color: "#ffffff",
          }}
        >
          📓 Abrir diário
        </button>
      </div>
    </div>
  )
}
