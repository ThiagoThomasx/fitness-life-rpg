"use client"

import { useEffect } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { BADGE_DEFINITIONS } from "@/lib/badges"
import { getWorkoutHistory } from "@/lib/workout-history"
import { getDiaryCount } from "@/lib/daily-log"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { attributeColor } from "@/lib/theme-colors"

const ATTRIBUTE_INFO = [
  { key: "strength" as const, label: "Força", icon: "💪", hint: "Treinos de força" },
  { key: "agility" as const, label: "Agilidade", icon: "⚡", hint: "Cardio e agilidade" },
  { key: "dexterity" as const, label: "Destreza", icon: "🎯", hint: "Agilidade e flexibilidade" },
  { key: "constitution" as const, label: "Constituição", icon: "🛡️", hint: "Treinos de força" },
  { key: "vitality" as const, label: "Vitalidade", icon: "❤️", hint: "Cardio e flexibilidade" },
]

export default function PerfilPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const { earnedBadges, refreshBadges } = useBadgeStore()

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  const character = storeCharacter ?? MOCK_CHARACTER
  const workoutHistory = typeof window !== "undefined" ? getWorkoutHistory() : []
  const diaryCount = typeof window !== "undefined" ? getDiaryCount() : 0
  const totalPrs = workoutHistory.reduce((a, w) => a + (w.prsCount ?? 0), 0)
  const earnedIds = new Set(earnedBadges.map((b) => b.badgeId))

  return (
    <div className="page">
      {/* Character summary */}
      <section className="card card--accent-top" style={{ paddingTop: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-level), var(--color-accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", flexShrink: 0,
          }} aria-hidden="true">
            🧙
          </div>
          <div>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
              {character.name}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <span className="badge-pill badge-pill--level">Nível {character.level}</span>
              <span className="badge-pill badge-pill--xp">
                {Math.floor(character.total_xp).toLocaleString("pt-BR")} XP total
              </span>
            </div>
          </div>
        </div>

        <div className="stat-grid stat-grid--3" style={{ marginTop: "1.25rem" }}>
          {[
            { label: "Treinos", value: workoutHistory.length, icon: "💪" },
            { label: "Diários", value: diaryCount, icon: "📓" },
            { label: "PRs", value: totalPrs, icon: "🏆" },
          ].map((stat) => (
            <div key={stat.label} className="stat-cell">
              <div style={{ fontSize: "1.25rem" }} aria-hidden="true">{stat.icon}</div>
              <div className="stat-cell__value">{stat.value}</div>
              <div className="stat-cell__label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Attributes */}
      <section>
        <h3 className="section-label">Atributos</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {ATTRIBUTE_INFO.map((attr) => {
            const raw = character[attr.key] as number
            const display = Math.floor(raw)
            const frac = raw - Math.floor(raw)
            const colors = attributeColor(attr.key)
            return (
              <div key={attr.key} className="card card--sm">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontSize: "1rem" }} aria-hidden="true">{attr.icon}</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)", flex: 1 }}>
                    {attr.label}
                  </span>
                  <span style={{ fontSize: "1rem", fontWeight: "var(--font-bold)", color: colors.text }}>
                    {display}
                  </span>
                </div>
                <div
                  className="progress-track progress-track--thin"
                  role="progressbar"
                  aria-valuenow={frac * 100}
                  aria-valuemax={100}
                  aria-label={`${attr.label}: ${Math.round(frac * 100)}% para próximo ponto`}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${frac * 100}%`, background: colors.fill }}
                  />
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  {attr.hint} · próximo ponto em {Math.round((1 - frac) * 100)}%
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <h3 className="section-label">
          Conquistas ({earnedIds.size}/{BADGE_DEFINITIONS.length})
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem" }}>
          {BADGE_DEFINITIONS.map((badge) => {
            const earned = earnedIds.has(badge.id)
            const earnedAt = earnedBadges.find((b) => b.badgeId === badge.id)?.earnedAt
            return (
              <div
                key={badge.id}
                className="card card--sm"
                style={{
                  background: earned ? "rgba(29,185,84,0.08)" : undefined,
                  borderColor: earned ? "rgba(29,185,84,0.25)" : undefined,
                  opacity: earned ? 1 : 0.45,
                  textAlign: "center",
                  padding: "0.875rem 0.75rem",
                }}
              >
                <div style={{ fontSize: "1.75rem", filter: earned ? "none" : "grayscale(1)" }} aria-hidden="true">
                  {badge.icon}
                </div>
                <div style={{
                  fontSize: "0.7rem", fontWeight: "var(--font-bold)",
                  color: earned ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  marginTop: "0.25rem", lineHeight: 1.2,
                }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", marginTop: "0.2rem", lineHeight: 1.3 }}>
                  {badge.description}
                </div>
                {earned && earnedAt && (
                  <div style={{ fontSize: "0.55rem", color: "var(--color-accent)", marginTop: "0.25rem" }}>
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
