"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore, formatElapsed } from "@/stores/useSessionStore"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { MOCK_CHARACTER, MOCK_EXERCISES } from "@/lib/mock/data"
import { calculateXpGain } from "@/lib/workout"
import { MOCK_WORKOUT_TYPES } from "@/lib/mock/data"
import type { Exercise } from "@/types/database"
import type { XpGainResult } from "@/stores/useCharacterStore"

// ─── Timer hook ───────────────────────────────────────────────────────────────

function useTimer(running: boolean) {
  const tickTimer = useSessionStore((s) => s.tickTimer)
  useEffect(() => {
    if (!running) return
    const id = setInterval(tickTimer, 1000)
    return () => clearInterval(id)
  }, [running, tickTimer])
}

// ─── Exercise picker modal ────────────────────────────────────────────────────

function ExercisePicker({
  onPick,
  onClose,
  alreadyAdded,
}: {
  onPick: (ex: Exercise) => void
  onClose: () => void
  alreadyAdded: string[]
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#121212",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxHeight: "70dvh",
          overflowY: "auto",
          padding: "1.25rem 1rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>Adicionar Exercício</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#b3b3b3", fontSize: "1.25rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {MOCK_EXERCISES.map((ex) => {
            const added = alreadyAdded.includes(ex.id)
            return (
              <button
                key={ex.id}
                disabled={added}
                onClick={() => { onPick(ex); onClose() }}
                style={{
                  background: added ? "#282828" : "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: added ? "default" : "pointer",
                  opacity: added ? 0.5 : 1,
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#ffffff" }}>{ex.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6a6a6a" }}>{ex.muscle_groups.join(", ")}</div>
                </div>
                {added && <span style={{ fontSize: "0.75rem", color: "#6a6a6a" }}>Adicionado</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Set row ──────────────────────────────────────────────────────────────────

function SetRow({
  index,
  weight,
  reps,
  onRemove,
}: {
  index: number
  weight: number
  reps: number
  onRemove: () => void
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2rem 1fr 1fr auto",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ fontSize: "0.75rem", color: "#6a6a6a", textAlign: "center" }}>{index + 1}</span>
      <span style={{ fontSize: "0.875rem", color: "#ffffff", textAlign: "center" }}>{weight} kg</span>
      <span style={{ fontSize: "0.875rem", color: "#ffffff", textAlign: "center" }}>{reps} reps</span>
      <button
        onClick={onRemove}
        style={{ background: "none", border: "none", color: "#6a6a6a", cursor: "pointer", fontSize: "1rem", padding: "0 0.25rem" }}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Add set form ─────────────────────────────────────────────────────────────

function AddSetForm({ onAdd }: { onAdd: (weight: number, reps: number) => void }) {
  const [weight, setWeight] = useState("60")
  const [reps, setReps] = useState("10")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return
    onAdd(w, r)
  }

  const inputStyle: React.CSSProperties = {
    background: "#282828",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "0.5rem 0.75rem",
    color: "#ffffff",
    fontSize: "0.875rem",
    width: "100%",
    textAlign: "center",
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", marginTop: "0.75rem" }}>
      <input
        type="number"
        min="0"
        step="0.5"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="Peso (kg)"
        style={inputStyle}
        inputMode="decimal"
      />
      <input
        type="number"
        min="1"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        placeholder="Reps"
        style={inputStyle}
        inputMode="numeric"
      />
      <button
        type="submit"
        style={{
          background: "#1db954",
          color: "#000",
          border: "none",
          borderRadius: 8,
          padding: "0.5rem 0.75rem",
          fontSize: "0.875rem",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        + Série
      </button>
    </form>
  )
}

// ─── XP Result modal ──────────────────────────────────────────────────────────

function XpResultModal({ result, onConfirm }: { result: XpGainResult; onConfirm: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#181818",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "2rem 1.5rem",
          textAlign: "center",
          maxWidth: 340,
          width: "100%",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
          {result.level_up ? "🎉" : "⚡"}
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.25rem" }}>
          Treino Concluído!
        </h2>
        {result.level_up && (
          <div
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: 10,
              padding: "0.5rem 1rem",
              marginTop: "0.75rem",
              marginBottom: "0.75rem",
              color: "#f59e0b",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            🏆 LEVEL UP! {result.old_level} → {result.new_level}
          </div>
        )}
        <div
          style={{
            background: "rgba(29,185,84,0.1)",
            border: "1px solid rgba(29,185,84,0.25)",
            borderRadius: 12,
            padding: "1rem",
            margin: "1rem 0",
          }}
        >
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#1db954" }}>
            +{result.xp_earned} XP
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6a6a6a", marginTop: "0.25rem" }}>
            Base {result.base_xp} XP · ×{result.intensity_multiplier.toFixed(1)} intensidade
          </div>
        </div>
        <button
          onClick={onConfirm}
          style={{
            background: "#1db954",
            color: "#000",
            border: "none",
            borderRadius: 9999,
            padding: "0.875rem 2rem",
            fontSize: "1rem",
            fontWeight: 800,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Ver Personagem
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SessaoPage() {
  const router = useRouter()
  const {
    activeSession,
    activeSets,
    elapsedSeconds,
    addExercise,
    addSet,
    removeSet,
    removeExercise,
    endSession,
  } = useSessionStore()

  const { character, applyXpGain } = useCharacterStore()
  const [showPicker, setShowPicker] = useState(false)
  const [xpResult, setXpResult] = useState<XpGainResult | null>(null)
  const hasSession = activeSession !== null

  useTimer(hasSession && xpResult === null)

  if (!hasSession) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          gap: "1rem",
          padding: "1rem",
        }}
      >
        <p style={{ color: "#b3b3b3", fontSize: "1rem" }}>Nenhuma sessão ativa.</p>
        <button
          onClick={() => router.push("/treinos")}
          style={{
            background: "#1db954",
            color: "#000",
            border: "none",
            borderRadius: 9999,
            padding: "0.75rem 1.5rem",
            fontWeight: 700,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Escolher Treino
        </button>
      </div>
    )
  }

  const totalSets = activeSets.reduce((acc, s) => acc + s.sets.length, 0)
  const alreadyAdded = activeSets.map((s) => s.exercise.id)

  function handleFinish() {
    const workoutTypeId = activeSets[0]?.exercise.workout_type_id ?? "wt-1"
    const workoutType =
      MOCK_WORKOUT_TYPES.find((wt) => wt.id === workoutTypeId) ?? MOCK_WORKOUT_TYPES[0]
    const char = character ?? MOCK_CHARACTER
    const result = calculateXpGain(workoutType, totalSets, elapsedSeconds, char)
    setXpResult(result)
  }

  function handleConfirmResult() {
    if (!xpResult) return
    applyXpGain(xpResult)
    endSession()
    router.push("/dashboard")
  }

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* Timer + header */}
      <div
        style={{
          background: "#181818",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sessão Ativa
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1db954", fontVariantNumeric: "tabular-nums" }}>
            {formatElapsed(elapsedSeconds)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#b3b3b3" }}>
            {totalSets} série{totalSets !== 1 ? "s" : ""} registrada{totalSets !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={handleFinish}
          disabled={totalSets === 0}
          style={{
            background: totalSets === 0 ? "#282828" : "#1db954",
            color: totalSets === 0 ? "#6a6a6a" : "#000",
            border: "none",
            borderRadius: 12,
            padding: "0.75rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: totalSets === 0 ? "default" : "pointer",
          }}
        >
          Finalizar
        </button>
      </div>

      {/* Exercises */}
      {activeSets.map((activeSet) => (
        <div
          key={activeSet.exercise.id}
          style={{
            background: "#181818",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>
              {activeSet.exercise.name}
            </h3>
            <button
              onClick={() => removeExercise(activeSet.exercise.id)}
              style={{ background: "none", border: "none", color: "#6a6a6a", cursor: "pointer", fontSize: "1rem" }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6a6a6a", marginBottom: "0.75rem" }}>
            {activeSet.exercise.muscle_groups.join(", ")}
          </div>

          {activeSet.sets.length > 0 && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2rem 1fr 1fr auto",
                  gap: "0.5rem",
                  padding: "0.25rem 0",
                  fontSize: "0.7rem",
                  color: "#6a6a6a",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ textAlign: "center" }}>#</span>
                <span style={{ textAlign: "center" }}>Peso</span>
                <span style={{ textAlign: "center" }}>Reps</span>
                <span />
              </div>
              {activeSet.sets.map((s, i) => (
                <SetRow
                  key={i}
                  index={i}
                  weight={s.weight_kg}
                  reps={s.reps}
                  onRemove={() => removeSet(activeSet.exercise.id, i)}
                />
              ))}
            </div>
          )}

          <AddSetForm
            onAdd={(weight, reps) =>
              addSet(activeSet.exercise.id, {
                exercise_id: activeSet.exercise.id,
                set_number: activeSet.sets.length + 1,
                weight_kg: weight,
                reps,
              })
            }
          />
        </div>
      ))}

      {/* Add exercise button */}
      <button
        onClick={() => setShowPicker(true)}
        style={{
          background: "#181818",
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: 16,
          padding: "1rem",
          color: "#b3b3b3",
          fontSize: "0.875rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>+</span> Adicionar Exercício
      </button>

      {showPicker && (
        <ExercisePicker
          alreadyAdded={alreadyAdded}
          onPick={(ex) => addExercise(ex)}
          onClose={() => setShowPicker(false)}
        />
      )}

      {xpResult && <XpResultModal result={xpResult} onConfirm={handleConfirmResult} />}
    </div>
  )
}
