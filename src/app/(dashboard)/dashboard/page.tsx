import { createClient } from "@/lib/supabase/server"
import type { Character } from "@/types/database"

async function getCharacter(userId: string): Promise<Character | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .single()
  return data
}

function xpToNextLevel(level: number): number {
  return 100 * level * level
}

const ATTRIBUTES = [
  { key: "strength" as const, label: "Força", icon: "💪" },
  { key: "agility" as const, label: "Agilidade", icon: "⚡" },
  { key: "dexterity" as const, label: "Destreza", icon: "🎯" },
  { key: "constitution" as const, label: "Constituição", icon: "🛡️" },
  { key: "vitality" as const, label: "Vitalidade", icon: "❤️" },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const character = await getCharacter(user.id)
  const needed = character ? xpToNextLevel(character.level) : 100
  const progress = character ? Math.min(character.current_xp / needed, 1) : 0

  if (!character) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <p style={{ color: "#b3b3b3", fontSize: "1.125rem" }}>Crie seu personagem para começar!</p>
      </div>
    )
  }

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 600, margin: "0 auto" }}>
      {/* Hero card */}
      <section style={{
        background: "#181818",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "1.25rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* top gradient bar */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #1db954, #f59e0b)",
        }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(139,92,246,0.15)",
              color: "#8b5cf6",
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "2px 0.5rem",
              borderRadius: 9999,
              width: "fit-content",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              Nv {character.level}
            </span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffffff" }}>{character.name}</h2>
            <p style={{ fontSize: "0.875rem", color: "#b3b3b3" }}>
              {character.current_xp} / {needed} XP
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              XP Total
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b" }}>
              {character.total_xp.toLocaleString("pt-BR")}
            </div>
          </div>
        </div>

        {/* XP progress bar */}
        <div style={{
          marginTop: "1rem",
          height: 6,
          background: "#282828",
          borderRadius: 9999,
          overflow: "hidden",
        }}>
          <div
            role="progressbar"
            aria-valuenow={character.current_xp}
            aria-valuemax={needed}
            aria-label="Progresso de XP"
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #1db954, #f59e0b)",
              borderRadius: 9999,
            }}
          />
        </div>
      </section>

      {/* Attributes */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "0.75rem",
      }}>
        {ATTRIBUTES.map((attr) => (
          <div
            key={attr.key}
            style={{
              background: "#181818",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "0.75rem 0.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{attr.icon}</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>
              {character[attr.key]}
            </span>
            <span style={{ fontSize: "0.625rem", color: "#6a6a6a", textAlign: "center", lineHeight: 1.2 }}>
              {attr.label}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
