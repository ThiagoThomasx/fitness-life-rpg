"use client"

import { useEffect } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { BADGE_DEFINITIONS } from "@/lib/badges"
import { getWorkoutHistory } from "@/lib/workout-history"
import { getDiaryCount } from "@/lib/daily-log"
import { MOCK_CHARACTER } from "@/lib/mock/data"

const ATTRIBUTE_INFO = [
  { key: "strength" as const, label: "Força", icon: "💪", color: "#ef4444", hint: "Treinos de força" },
  { key: "agility" as const, label: "Agilidade", icon: "⚡", color: "#f59e0b", hint: "Cardio e agilidade" },
  { key: "dexterity" as const, label: "Destreza", icon: "🎯", color: "#8b5cf6", hint: "Agilidade e flexibilidade" },
  { key: "constitution" as const, label: "Constituição", icon: "🛡️", color: "#3b82f6", hint: "Treinos de força" },
  { key: "vitality" as const, label: "Vitalidade", icon: "❤️", color: "#ec4899", hint: "Cardio e flexibilidade" },
]

export default function PerfilPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const { earnedBadges, refreshBadges } = useBadgeStore()

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  const character = storeCharacter ?? MOCK_CHARACTER
  const workoutHistory = typeof window !== 'undefined' ? getWorkoutHistory() : []
  const diaryCount = typeof window !== 'undefined' ? getDiaryCount() : 0
  const totalPrs = workoutHistory.reduce((a, w) => a + (w.prsCount ?? 0), 0)
  const earnedIds = new Set(earnedBadges.map((b) => b.badgeId))

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 600, margin: "0 auto" }}>
      {/* Character summary */}
      <section style={{
        background: "#181818",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "1.25rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #8b5cf6, #1db954)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: 4 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8b5cf6, #1db954)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            flexShrink: 0,
          }}>
            🧙
          </div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>{character.name}</div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#8b5cf6", background: "rgba(139,92,246,0.15)", padding: "2px 8px", borderRadius: 9999 }}>
                Nível {character.level}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 9999 }}>
                {Math.floor(character.total_xp).toLocaleString("pt-BR")} XP total
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginTop: "1.25rem" }}>
          {[
            { label: "Treinos", value: workoutHistory.length, icon: "💪" },
            { label: "Diários", value: diaryCount, icon: "📓" },
            { label: "PRs", value: totalPrs, icon: "🏆" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#282828", borderRadius: 10, padding: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>{stat.value}</div>
              <div style={{ fontSize: "0.65rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.04em" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Attributes */}
      <section>
        <h3 style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
          Atributos
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {ATTRIBUTE_INFO.map((attr) => {
            const raw = character[attr.key] as number
            const display = Math.floor(raw)
            const frac = raw - Math.floor(raw)
            return (
              <div key={attr.key} style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontSize: "1rem" }}>{attr.icon}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#ffffff", flex: 1 }}>{attr.label}</span>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: attr.color }}>{display}</span>
                </div>
                <div style={{ height: 4, background: "#282828", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${frac * 100}%`,
                    background: attr.color,
                    borderRadius: 9999,
                    transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{ fontSize: "0.65rem", color: "#6a6a6a", marginTop: "0.25rem" }}>
                  {attr.hint} • próximo ponto em {Math.round((1 - frac) * 100)}%
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <h3 style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
          Conquistas ({earnedIds.size}/{BADGE_DEFINITIONS.length})
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem" }}>
          {BADGE_DEFINITIONS.map((badge) => {
            const earned = earnedIds.has(badge.id)
            const earnedAt = earnedBadges.find((b) => b.badgeId === badge.id)?.earnedAt
            return (
              <div
                key={badge.id}
                style={{
                  background: earned ? "rgba(29,185,84,0.08)" : "#181818",
                  border: `1px solid ${earned ? "rgba(29,185,84,0.25)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12,
                  padding: "0.875rem 0.75rem",
                  textAlign: "center",
                  opacity: earned ? 1 : 0.45,
                  position: "relative",
                }}
              >
                <div style={{ fontSize: "1.75rem", filter: earned ? "none" : "grayscale(1)" }}>{badge.icon}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: earned ? "#ffffff" : "#6a6a6a", marginTop: "0.25rem", lineHeight: 1.2 }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: "0.6rem", color: "#6a6a6a", marginTop: "0.2rem", lineHeight: 1.3 }}>
                  {badge.description}
                </div>
                {earned && earnedAt && (
                  <div style={{ fontSize: "0.55rem", color: "#1db954", marginTop: "0.25rem" }}>
                    ✓ {new Date(earnedAt).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
