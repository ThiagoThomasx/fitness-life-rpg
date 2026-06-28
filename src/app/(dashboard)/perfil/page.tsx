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
  { key: "dexterity" as const, label: "Destreza", icon: "🎯", hint: "Flexibilidade" },
  { key: "constitution" as const, label: "Constituição", icon: "🛡️", hint: "Treinos de força" },
  { key: "vitality" as const, label: "Vitalidade", icon: "❤️", hint: "Cardio e flexibilidade" },
]

const AVATAR_OPTIONS = ["🧙", "⚔️", "🦸", "🏆", "🔥", "🐉", "🦁", "🌟", "💎", "🚀"]
const AVATAR_KEY = "lrpg-fit:avatar"
const NAME_KEY = "lrpg-fit:char-name"

// Avatar → dynamic backdrop color
const AVATAR_COLORS: Record<string, string> = {
  "🧙": "rgba(139,92,246,0.5)",
  "⚔️": "rgba(239,68,68,0.45)",
  "🦸": "rgba(59,130,246,0.45)",
  "🏆": "rgba(245,158,11,0.45)",
  "🔥": "rgba(239,68,68,0.5)",
  "🐉": "rgba(29,185,84,0.45)",
  "🦁": "rgba(245,158,11,0.5)",
  "🌟": "rgba(245,158,11,0.4)",
  "💎": "rgba(59,130,246,0.5)",
  "🚀": "rgba(29,185,84,0.4)",
}

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

  const heroColor = AVATAR_COLORS[avatar] ?? "rgba(29,185,84,0.4)"

  return (
    <div className="page" style={{ gap: "1.25rem" }}>

      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <section
        className="profile-hero"
        style={{ "--profile-hero-color": heroColor } as React.CSSProperties}
      >
        <div className="profile-hero__backdrop" />
        <div className="profile-hero__content">
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
            {/* Avatar */}
            <button
              className="profile-hero__avatar"
              onClick={() => setShowAvatarPicker((v) => !v)}
              title="Trocar avatar"
              style={{ "--profile-hero-color": heroColor } as React.CSSProperties}
            >
              {avatar}
            </button>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: "0.125rem" }}>
              {editingName ? (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false) }}
                    maxLength={30}
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
                      border: "1px solid var(--color-accent)", borderRadius: 8,
                      padding: "0.375rem 0.625rem", color: "#fff",
                      fontSize: "1.25rem", fontWeight: 700, minWidth: 0,
                    }}
                  />
                  <button onClick={handleSaveName} style={{ background: "var(--color-accent)", border: "none", borderRadius: 8, padding: "0.375rem 0.875rem", color: "#000", fontWeight: 700, cursor: "pointer" }}>OK</button>
                  <button onClick={() => setEditingName(false)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.375rem 0.5rem", color: "#b3b3b3", cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.125rem" }}
                >
                  <span className="profile-hero__name">{charName}</span>
                  <button
                    onClick={() => { setNameInput(charName); setEditingName(true) }}
                    title="Editar nome"
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.8rem", padding: "2px", lineHeight: 1 }}
                  >✏️</button>
                </div>
              )}
              <div className="profile-hero__title">{getCharTitle(character.level)}</div>
              <div className="profile-hero__meta">
                <span className="badge-pill badge-pill--level">Nível {character.level}</span>
                <span className="badge-pill badge-pill--xp">{Math.floor(character.total_xp).toLocaleString("pt-BR")} XP</span>
                {earnedCount > 0 && (
                  <span className="badge-pill" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                    🏆 {earnedCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Avatar picker */}
          {showAvatarPicker && (
            <div style={{
              marginTop: "1rem", padding: "0.875rem",
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
              borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.625rem" }}>
                Escolha seu personagem
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {AVATAR_OPTIONS.map((em) => (
                  <button key={em} onClick={() => handlePickAvatar(em)} style={{
                    background: avatar === em ? "rgba(29,185,84,0.2)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${avatar === em ? "rgba(29,185,84,0.5)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10, padding: "0.5rem 0.625rem", fontSize: "1.625rem",
                    cursor: "pointer", transition: "all 120ms ease",
                    boxShadow: avatar === em ? "0 0 12px rgba(29,185,84,0.25)" : "none",
                  }}>{em}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="profile-hero__stats">
          {[
            { label: "Treinos", value: workoutHistory.length },
            { label: "Diários", value: diaryCount },
            { label: "PRs", value: totalPrs },
          ].map((stat) => (
            <div key={stat.label} className="profile-hero__stat">
              <div className="profile-hero__stat-value">{stat.value}</div>
              <div className="profile-hero__stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Attributes ───────────────────────────────────────────────── */}
      <section>
        <div className="section-header">
          <h3 className="section-header__title">Atributos</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.625rem" }}>
          {ATTRIBUTE_INFO.map((attr) => {
            const raw = character[attr.key] as number
            const display = Math.floor(raw)
            const frac = raw - Math.floor(raw)
            const colors = attributeColor(attr.key)
            return (
              <div key={attr.key} className="attr-card">
                <div
                  className="attr-card__glow"
                  style={{ background: colors.fill, transform: "translate(10px, -10px)" }}
                />
                <div className="attr-card__icon">{attr.icon}</div>
                <div className="attr-card__name">{attr.label}</div>
                <div className="attr-card__value" style={{ color: colors.text }}>{display}</div>
                <div className="attr-card__progress" role="progressbar" aria-valuenow={Math.round(frac * 100)} aria-valuemax={100} aria-label={`${attr.label}: ${Math.round(frac * 100)}%`}>
                  <div
                    className="attr-card__progress-fill"
                    style={{ width: `${frac * 100}%`, background: colors.fill }}
                  />
                </div>
                <div className="attr-card__hint">{attr.hint} · {Math.round((1 - frac) * 100)}% p/ próximo</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── Quick links ──────────────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h3 className="section-label">Dados & configurações</h3>
        {[
          { href: "/configuracoes", icon: "⚙️", label: "Dados & Backup", desc: "Exportar, importar e resetar dados locais" },
          { href: "/insights", icon: "📊", label: "Ver Insights", desc: "Gráficos de progresso e histórico" },
        ].map((link) => (
          <Link key={link.href} href={link.href} style={{
            display: "flex", alignItems: "center", gap: "0.875rem",
            padding: "0.875rem 1rem",
            background: "var(--color-surface-1)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "var(--radius-xl)", textDecoration: "none",
            color: "var(--color-text-primary)",
            transition: "background 120ms ease, border-color 120ms ease",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.125rem", flexShrink: 0,
            }}>{link.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)" }}>{link.label}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>{link.desc}</div>
            </div>
            <span style={{ color: "var(--color-text-muted)", fontSize: "1rem", opacity: 0.5 }}>›</span>
          </Link>
        ))}
      </section>

      {/* ─── Badges ───────────────────────────────────────────────────── */}
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
                style={{
                  background: earned ? "rgba(29,185,84,0.08)" : "var(--color-surface-1)",
                  border: `1px solid ${earned ? "rgba(29,185,84,0.25)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "var(--radius-lg)",
                  opacity: earned ? 1 : 0.4,
                  textAlign: "center",
                  padding: "0.875rem 0.625rem",
                  transition: "opacity 200ms ease",
                }}
              >
                <div style={{ fontSize: "1.75rem", filter: earned ? "none" : "grayscale(1)", marginBottom: "0.375rem" }} aria-hidden="true">
                  {badge.icon}
                </div>
                <div style={{ fontSize: "0.7rem", fontWeight: "var(--font-bold)", color: earned ? "var(--color-text-primary)" : "var(--color-text-muted)", lineHeight: 1.25 }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", marginTop: "0.25rem", lineHeight: 1.3 }}>
                  {badge.description}
                </div>
                {earned && earnedAt && (
                  <div style={{ fontSize: "0.55rem", color: "var(--color-accent)", marginTop: "0.3rem", fontWeight: "var(--font-semibold)" }}>
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
