"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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

const AVATAR_OPTIONS = ["🧙", "⚔️", "🦸", "🏆", "🔥", "🐉", "🦁", "🌟", "💎", "🚀"]
const AVATAR_KEY = "lrpg-fit:avatar"
const NAME_KEY = "lrpg-fit:char-name"

function getSavedAvatar(): string {
  if (typeof window === "undefined") return "🧙"
  return window.localStorage.getItem(AVATAR_KEY) ?? "🧙"
}

function getSavedName(fallback: string): string {
  if (typeof window === "undefined") return fallback
  return window.localStorage.getItem(NAME_KEY) ?? fallback
}

function getCharTitle(level: number): string {
  if (level === 1) return "Iniciante em Movimento"
  if (level <= 3) return "Aventureiro"
  if (level <= 7) return "Guerreiro"
  if (level <= 12) return "Herói"
  if (level <= 20) return "Lendário"
  return "Campeão Supremo"
}

export default function PerfilPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const setCharacter = useCharacterStore((s) => s.setCharacter)
  const { earnedBadges, refreshBadges } = useBadgeStore()

  useEffect(() => { refreshBadges() }, [refreshBadges])

  const character = storeCharacter ?? MOCK_CHARACTER
  const workoutHistory = typeof window !== "undefined" ? getWorkoutHistory() : []
  const diaryCount = typeof window !== "undefined" ? getDiaryCount() : 0
  const totalPrs = workoutHistory.reduce((a, w) => a + (w.prsCount ?? 0), 0)
  const earnedIds = new Set(earnedBadges.map((b) => b.badgeId))
  const earnedCount = earnedIds.size

  const [avatar, setAvatarState] = useState("🧙")
  const [charName, setCharName] = useState(character.name)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  useEffect(() => {
    setAvatarState(getSavedAvatar())
    setCharName(getSavedName(character.name))
  }, [character.name])

  function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) { setEditingName(false); return }
    window.localStorage.setItem(NAME_KEY, trimmed)
    setCharName(trimmed)
    setCharacter({ ...character, name: trimmed })
    setEditingName(false)
  }

  function handlePickAvatar(em: string) {
    window.localStorage.setItem(AVATAR_KEY, em)
    setAvatarState(em)
    setShowAvatarPicker(false)
  }

  return (
    <div className="page">
      {/* Hero character card */}
      <section className="card card--accent-top" style={{ paddingTop: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          {/* Avatar */}
          <button
            onClick={() => setShowAvatarPicker((v) => !v)}
            title="Trocar avatar"
            style={{
              width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, var(--color-level), var(--color-accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.875rem", border: "none", cursor: "pointer",
              boxShadow: "0 0 0 2px rgba(29,185,84,0.3)",
            }}
          >
            {avatar}
          </button>

          {/* Name + level */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false) }}
                  maxLength={30}
                  style={{
                    flex: 1, background: "#282828", border: "1px solid var(--color-accent)",
                    borderRadius: 8, padding: "0.375rem 0.5rem", color: "#fff", fontSize: "1rem",
                    fontWeight: 700, minWidth: 0,
                  }}
                />
                <button onClick={handleSaveName} style={{ background: "var(--color-accent)", border: "none", borderRadius: 8, padding: "0.375rem 0.75rem", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}>OK</button>
                <button onClick={() => setEditingName(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.375rem 0.5rem", color: "#b3b3b3", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)" }}>
                  {charName}
                </span>
                <button
                  onClick={() => { setNameInput(charName); setEditingName(true) }}
                  title="Editar nome"
                  style={{ background: "none", border: "none", color: "#6a6a6a", cursor: "pointer", fontSize: "0.875rem", padding: "2px" }}
                >✏️</button>
              </div>
            )}
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
              {getCharTitle(character.level)}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="badge-pill badge-pill--level">Nível {character.level}</span>
              <span className="badge-pill badge-pill--xp">{Math.floor(character.total_xp).toLocaleString("pt-BR")} XP total</span>
              {earnedCount > 0 && (
                <span className="badge-pill" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                  🏆 {earnedCount} badge{earnedCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar picker */}
        {showAvatarPicker && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--color-bg-base)", borderRadius: 12, border: "1px solid var(--color-border-subtle)" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Escolha seu avatar</div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {AVATAR_OPTIONS.map((em) => (
                <button key={em} onClick={() => handlePickAvatar(em)} style={{
                  background: avatar === em ? "rgba(29,185,84,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${avatar === em ? "rgba(29,185,84,0.4)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10, padding: "0.4rem 0.5rem", fontSize: "1.5rem", cursor: "pointer",
                }}>{em}</button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
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
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)", flex: 1 }}>{attr.label}</span>
                  <span style={{ fontSize: "1rem", fontWeight: "var(--font-bold)", color: colors.text }}>{display}</span>
                </div>
                <div className="progress-track progress-track--thin" role="progressbar" aria-valuenow={frac * 100} aria-valuemax={100} aria-label={`${attr.label}: ${Math.round(frac * 100)}%`}>
                  <div className="progress-fill" style={{ width: `${frac * 100}%`, background: colors.fill }} />
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  {attr.hint} · próximo ponto em {Math.round((1 - frac) * 100)}%
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Quick links */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h3 className="section-label">Dados & configurações</h3>
        {[
          { href: "/configuracoes", icon: "⚙️", label: "Dados & Backup", desc: "Exportar, importar e resetar dados locais" },
          { href: "/insights", icon: "📊", label: "Ver Insights", desc: "Gráficos de progresso e histórico" },
        ].map((link) => (
          <Link key={link.href} href={link.href} style={{
            display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem",
            background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-xl)", textDecoration: "none", color: "var(--color-text-primary)",
          }}>
            <span style={{ fontSize: "1.25rem" }} aria-hidden="true">{link.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)" }}>{link.label}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{link.desc}</div>
            </div>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>›</span>
          </Link>
        ))}
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
              <div key={badge.id} className="card card--sm" style={{
                background: earned ? "rgba(29,185,84,0.08)" : undefined,
                borderColor: earned ? "rgba(29,185,84,0.25)" : undefined,
                opacity: earned ? 1 : 0.45, textAlign: "center", padding: "0.875rem 0.75rem",
              }}>
                <div style={{ fontSize: "1.75rem", filter: earned ? "none" : "grayscale(1)" }} aria-hidden="true">{badge.icon}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: "var(--font-bold)", color: earned ? "var(--color-text-primary)" : "var(--color-text-muted)", marginTop: "0.25rem", lineHeight: 1.2 }}>
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
