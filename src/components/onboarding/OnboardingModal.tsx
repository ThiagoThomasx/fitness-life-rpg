"use client"

import { useState } from "react"
import {
  completeOnboarding,
  GOAL_LABELS,
  GOAL_ICONS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  STYLE_LABELS,
  DAY_LABELS,
  DURATION_OPTIONS,
  type FitnessGoal,
  type Equipment,
  type FitnessLevel,
  type WorkoutStyle,
} from "@/lib/preferences"

interface OnboardingModalProps {
  onComplete: () => void
}

type Step = 1 | 2 | 3 | 4

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [goal, setGoal] = useState<FitnessGoal>("stay_healthy")
  const [equipment, setEquipment] = useState<Equipment[]>(["bodyweight"])
  const [avgMinutes, setAvgMinutes] = useState(45)
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 3, 5])
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("beginner")
  const [workoutStyle, setWorkoutStyle] = useState<WorkoutStyle>("mixed")

  function toggleEquipment(eq: Equipment) {
    setEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    )
  }

  function toggleDay(d: number) {
    setPreferredDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    )
  }

  function handleFinish() {
    completeOnboarding({
      goal,
      equipment: equipment.length > 0 ? equipment : ["bodyweight"],
      avgWorkoutMinutes: avgMinutes,
      preferredDays: preferredDays.length > 0 ? preferredDays : [1, 3, 5],
      fitnessLevel,
      workoutStyle,
    })
    onComplete()
  }

  const GOALS = Object.entries(GOAL_LABELS) as [FitnessGoal, string][]
  const EQUIPMENTS = Object.entries(EQUIPMENT_LABELS) as [Equipment, string][]
  const LEVELS = Object.entries(LEVEL_LABELS) as [FitnessLevel, string][]
  const STYLES = Object.entries(STYLE_LABELS) as [WorkoutStyle, string][]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configuração inicial"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 20,
          padding: "1.75rem 1.5rem",
          width: "100%",
          maxWidth: 420,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem" }}>
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 9999,
                background: s <= step ? "var(--color-accent)" : "var(--color-border-subtle)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", marginBottom: 4 }}>
              🎯 Qual é seu objetivo principal?
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
              Vamos personalizar sua experiência com base nisso.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {GOALS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setGoal(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.875rem 1rem",
                    borderRadius: 12,
                    border: `1px solid ${goal === key ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    background: goal === key ? "rgba(29,185,84,0.1)" : "var(--color-bg-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: "1.25rem" }}>{GOAL_ICONS[key]}</span>
                  <span style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-semibold)",
                    color: goal === key ? "var(--color-accent)" : "var(--color-text-primary)",
                  }}>{label}</span>
                  {goal === key && <span style={{ marginLeft: "auto", color: "var(--color-accent)" }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", marginBottom: 4 }}>
              🏋️ Qual equipamento você tem?
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
              Selecione tudo que está disponível para você.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {EQUIPMENTS.map(([key, label]) => {
                const sel = equipment.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleEquipment(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderRadius: 12,
                      border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                      background: sel ? "rgba(29,185,84,0.1)" : "var(--color-bg-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `2px solid ${sel ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                      background: sel ? "var(--color-accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.6rem", color: "#fff", flexShrink: 0,
                    }}>
                      {sel ? "✓" : ""}
                    </span>
                    <span style={{
                      fontSize: "var(--text-sm)",
                      color: sel ? "var(--color-accent)" : "var(--color-text-primary)",
                    }}>{label}</span>
                  </button>
                )
              })}
            </div>

            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "0.625rem" }}>
              ⏱️ Tempo médio por treino
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setAvgMinutes(d)}
                  style={{
                    padding: "0.375rem 0.875rem",
                    borderRadius: 9999,
                    border: `1px solid ${avgMinutes === d ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    background: avgMinutes === d ? "rgba(29,185,84,0.12)" : "transparent",
                    color: avgMinutes === d ? "var(--color-accent)" : "var(--color-text-secondary)",
                    fontSize: "var(--text-sm)",
                    fontWeight: avgMinutes === d ? "var(--font-bold)" : "var(--font-normal)",
                    cursor: "pointer",
                  }}
                >
                  {d}min
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", marginBottom: 4 }}>
              📅 Quais dias você prefere treinar?
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
              Usaremos isso para sugerir sua rotina semanal.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.375rem", marginBottom: "1.5rem" }}>
              {DAY_LABELS.map((label, i) => {
                const sel = preferredDays.includes(i)
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
                      fontWeight: "var(--font-bold)",
                      color: sel ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}>{label}</span>
                  </button>
                )
              })}
            </div>

            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: "0.625rem" }}>
              📊 Seu nível atual
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {LEVELS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFitnessLevel(key)}
                  style={{
                    flex: 1, padding: "0.5rem",
                    borderRadius: 10,
                    border: `1px solid ${fitnessLevel === key ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    background: fitnessLevel === key ? "rgba(29,185,84,0.12)" : "transparent",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    fontWeight: fitnessLevel === key ? "var(--font-bold)" : "var(--font-normal)",
                    color: fitnessLevel === key ? "var(--color-accent)" : "var(--color-text-secondary)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", marginBottom: 4 }}>
              ⚡ Qual estilo de treino você prefere?
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
              Isso ajuda a recomendar os melhores treinos para você.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
              {STYLES.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setWorkoutStyle(key)}
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius: 12,
                    border: `1px solid ${workoutStyle === key ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    background: workoutStyle === key ? "rgba(29,185,84,0.1)" : "var(--color-bg-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "var(--text-sm)",
                    fontWeight: workoutStyle === key ? "var(--font-bold)" : "var(--font-normal)",
                    color: workoutStyle === key ? "var(--color-accent)" : "var(--color-text-primary)",
                    transition: "all 0.2s",
                  }}
                >
                  {label}
                  {workoutStyle === key && <span style={{ float: "right" }}>✓</span>}
                </button>
              ))}
            </div>

            <div style={{
              background: "rgba(29,185,84,0.06)",
              border: "1px solid rgba(29,185,84,0.2)",
              borderRadius: 12,
              padding: "0.875rem 1rem",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
            }}>
              ✨ Suas preferências vão personalizar treinos, missões, plano semanal e insights. Você pode editar a qualquer momento em <strong>Perfil → Preferências</strong>.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="btn btn--ghost"
              style={{ flex: 1 }}
            >
              Voltar
            </button>
          )}
          {step === 1 && (
            <button
              onClick={handleFinish}
              className="btn btn--ghost"
              style={{ flex: 1, fontSize: "var(--text-xs)" }}
            >
              Pular
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="btn btn--primary"
              style={{ flex: 2 }}
            >
              Continuar →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="btn btn--primary"
              style={{ flex: 2 }}
            >
              🚀 Começar personalizado!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
