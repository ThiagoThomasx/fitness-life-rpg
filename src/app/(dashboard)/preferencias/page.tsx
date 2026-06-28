"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  getPreferences,
  savePreferences,
  GOAL_LABELS,
  GOAL_ICONS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  STYLE_LABELS,
  DAY_LABELS,
  DURATION_OPTIONS,
  type UserPreferences,
  type FitnessGoal,
  type Equipment,
  type FitnessLevel,
  type WorkoutStyle,
} from "@/lib/preferences"

const GOALS = Object.entries(GOAL_LABELS) as [FitnessGoal, string][]
const EQUIPMENTS = Object.entries(EQUIPMENT_LABELS) as [Equipment, string][]
const LEVELS = Object.entries(LEVEL_LABELS) as [FitnessLevel, string][]
const STYLES = Object.entries(STYLE_LABELS) as [WorkoutStyle, string][]

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: 9999,
        border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
        background: selected ? "rgba(29,185,84,0.12)" : "transparent",
        color: selected ? "var(--color-accent)" : "var(--color-text-secondary)",
        fontSize: "var(--text-sm)",
        fontWeight: selected ? "var(--font-bold)" : "var(--font-normal)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="section-label" style={{ marginBottom: "0.75rem" }}>
      {children}
    </h3>
  )
}

export default function PreferenciasPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(getPreferences())
  }, [])

  const handleSave = useCallback(() => {
    if (!prefs) return
    savePreferences({ ...prefs, onboardingCompleted: true })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }, [prefs])

  function update<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPrefs((p) => p ? { ...p, [key]: value } : p)
  }

  function toggleEquipment(eq: Equipment) {
    if (!prefs) return
    const next = prefs.equipment.includes(eq)
      ? prefs.equipment.filter((e) => e !== eq)
      : [...prefs.equipment, eq]
    update("equipment", next.length > 0 ? next : ["bodyweight"])
  }

  function toggleDay(d: number) {
    if (!prefs) return
    const next = prefs.preferredDays.includes(d)
      ? prefs.preferredDays.filter((x) => x !== d)
      : [...prefs.preferredDays, d].sort((a, b) => a - b)
    update("preferredDays", next.length > 0 ? next : [1, 3, 5])
  }

  if (!prefs) {
    return (
      <main className="page-container">
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          Carregando…
        </div>
      </main>
    )
  }

  return (
    <main className="page-container">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-secondary)", fontSize: "1.25rem", padding: 0,
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)" }}>
            ⚙️ Preferências
          </h1>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
            Personalize sua experiência no app
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Goal */}
        <section className="card">
          <SectionTitle>🎯 Objetivo principal</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {GOALS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => update("goal", key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: 12,
                  border: `1px solid ${prefs.goal === key ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                  background: prefs.goal === key ? "rgba(29,185,84,0.08)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "1.125rem" }}>{GOAL_ICONS[key]}</span>
                <span style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: prefs.goal === key ? "var(--font-bold)" : "var(--font-normal)",
                  color: prefs.goal === key ? "var(--color-accent)" : "var(--color-text-primary)",
                }}>
                  {label}
                </span>
                {prefs.goal === key && (
                  <span style={{ marginLeft: "auto", color: "var(--color-accent)", fontWeight: "bold" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Fitness level + style */}
        <section className="card">
          <SectionTitle>📊 Nível e estilo</SectionTitle>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "0.625rem" }}>
            Nível atual
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {LEVELS.map(([key, label]) => (
              <ChipButton key={key} selected={prefs.fitnessLevel === key} onClick={() => update("fitnessLevel", key)}>
                {label}
              </ChipButton>
            ))}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "0.625rem" }}>
            Estilo preferido
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {STYLES.map(([key, label]) => (
              <ChipButton key={key} selected={prefs.workoutStyle === key} onClick={() => update("workoutStyle", key)}>
                {label}
              </ChipButton>
            ))}
          </div>
        </section>

        {/* Equipment */}
        <section className="card">
          <SectionTitle>🏋️ Equipamentos disponíveis</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {EQUIPMENTS.map(([key, label]) => {
              const sel = prefs.equipment.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleEquipment(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 10,
                    border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    background: sel ? "rgba(29,185,84,0.06)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${sel ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    background: sel ? "var(--color-accent)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.55rem", color: "#fff",
                  }}>
                    {sel ? "✓" : ""}
                  </span>
                  <span style={{
                    fontSize: "var(--text-sm)",
                    color: sel ? "var(--color-accent)" : "var(--color-text-primary)",
                  }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Schedule */}
        <section className="card">
          <SectionTitle>📅 Dias preferidos de treino</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.375rem", marginBottom: "1.25rem" }}>
            {DAY_LABELS.map((label, i) => {
              const sel = prefs.preferredDays.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 4, padding: "0.625rem 0",
                    borderRadius: 10,
                    border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    background: sel ? "rgba(29,185,84,0.12)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: sel ? "var(--font-bold)" : "var(--font-normal)",
                    color: sel ? "var(--color-accent)" : "var(--color-text-muted)",
                  }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "0.625rem" }}>
            ⏱️ Tempo médio por treino
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {DURATION_OPTIONS.map((d) => (
              <ChipButton
                key={d}
                selected={prefs.avgWorkoutMinutes === d}
                onClick={() => update("avgWorkoutMinutes", d)}
              >
                {d}min
              </ChipButton>
            ))}
          </div>
        </section>
      </div>

      {/* Save */}
      <div style={{ position: "sticky", bottom: "calc(var(--bottomnav-height) + 1rem)", paddingTop: "1rem" }}>
        <button
          onClick={handleSave}
          className="btn btn--primary"
          style={{ width: "100%", fontSize: "var(--text-base)", padding: "0.875rem" }}
        >
          {saved ? "✓ Preferências salvas!" : "Salvar preferências"}
        </button>
      </div>
    </main>
  )
}
