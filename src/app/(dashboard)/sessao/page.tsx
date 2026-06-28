"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore, formatElapsed } from "@/stores/useSessionStore"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { MOCK_CHARACTER, MOCK_WORKOUTS } from "@/lib/mock/data"
import { calculateXpGain } from "@/lib/workout"
import { MOCK_WORKOUT_TYPES } from "@/lib/mock/data"
import { getExercisePersonalBest, saveCompletedWorkout, getWorkoutHistory } from "@/lib/workout-history"
import type { CompletedWorkout } from "@/lib/workout-history"
import type { Exercise } from "@/types/database"
import type { XpGainResult } from "@/stores/useCharacterStore"
import { calculateAttributeGains } from "@/lib/attributes"
import { checkAndEarnBadges } from "@/lib/badges"
import { getDiaryCount } from "@/lib/daily-log"
import { addRewardEvent } from "@/lib/reward-events"
import { useRewardStore } from "@/stores/useRewardStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { getCustomWorkouts, getAllExercises, type ExerciseTarget } from "@/lib/custom-workouts"
import { suggestProgression } from "@/lib/progression"

const CATEGORY_COLORS: Record<string, string> = {
  strength: "#C0392B",
  cardio: "#2980B9",
  agility: "#E67E22",
  flexibility: "#16A085",
  dexterity: "#8E44AD",
}

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
        zIndex: 200,
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
          {getAllExercises().map((ex) => {
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
  isPr,
  onRemove,
}: {
  index: number
  weight: number
  reps: number
  isPr: boolean
  onRemove: () => void
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2rem 1fr 1fr auto auto",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ fontSize: "0.75rem", color: "#6a6a6a", textAlign: "center" }}>{index + 1}</span>
      <span style={{ fontSize: "0.875rem", color: "#ffffff", textAlign: "center" }}>{weight} kg</span>
      <span style={{ fontSize: "0.875rem", color: "#ffffff", textAlign: "center" }}>{reps} reps</span>
      {isPr ? (
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "1px 6px", borderRadius: 9999 }}>PR</span>
      ) : (
        <span />
      )}
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

function AddSetForm({
  onAdd,
  defaultWeight,
  defaultReps,
}: {
  onAdd: (weight: number, reps: number) => void
  defaultWeight?: number | null
  defaultReps?: number
}) {
  const [weight, setWeight] = useState(defaultWeight ? String(defaultWeight) : "60")
  const [reps, setReps] = useState(defaultReps ? String(defaultReps) : "10")

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
          {result.level_up ? "🎉" : result.prsCount > 0 ? "🏆" : "⚡"}
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
              color: "#f59e0b",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            🏅 LEVEL UP! {result.old_level} → {result.new_level}
          </div>
        )}

        {result.prsCount > 0 && (
          <div
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 10,
              padding: "0.5rem 1rem",
              marginTop: "0.75rem",
              color: "#f59e0b",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            🎯 {result.prsCount} Recorde{result.prsCount > 1 ? "s" : ""} Pessoal{result.prsCount > 1 ? "is" : ""}!
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.5rem" }}>
            {result.breakdown.map((item) => (
              <div key={item.label} style={{ fontSize: "0.75rem", color: "#6a6a6a", display: "flex", justifyContent: "space-between" }}>
                <span>{item.label}</span>
                <span style={{ color: "#b3b3b3" }}>+{item.amount}</span>
              </div>
            ))}
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

  const { character, applyXpGain, applyAttributeGains } = useCharacterStore()
  const pushReward = useRewardStore((s) => s.pushReward)
  const refreshBadges = useBadgeStore((s) => s.refreshBadges)
  const [showPicker, setShowPicker] = useState(false)
  const [xpResult, setXpResult] = useState<XpGainResult | null>(null)
  const [prExerciseIds, setPrExerciseIds] = useState<Set<string>>(new Set())
  const [workoutTargets, setWorkoutTargets] = useState<ExerciseTarget[]>([])
  const hasSession = activeSession !== null

  useEffect(() => {
    if (!activeSession?.workout_id) return
    const custom = getCustomWorkouts().find((w) => w.id === activeSession.workout_id)
    setWorkoutTargets(custom?.targets ?? [])
  }, [activeSession?.workout_id])

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

    // Detect PRs by comparing max weight per exercise to personal best
    let prsCount = 0
    const prIds = new Set<string>()
    for (const activeSet of activeSets) {
      if (activeSet.sets.length === 0) continue
      const pb = getExercisePersonalBest(activeSet.exercise.id)
      const maxWeight = activeSet.sets.reduce((max, s) => Math.max(max, s.weight_kg), 0)
      if (pb > 0 && maxWeight > pb) {
        prsCount++
        prIds.add(activeSet.exercise.id)
      }
    }
    setPrExerciseIds(prIds)

    const result = calculateXpGain(workoutType, totalSets, elapsedSeconds, char, prsCount)

    // Persist workout to history
    const mockWorkout = MOCK_WORKOUTS.find((w) => w.id === activeSession!.workout_id)
    const customWorkout = getCustomWorkouts().find((w) => w.id === activeSession!.workout_id)
    const workoutColor = mockWorkout?.color ?? CATEGORY_COLORS[workoutType.category] ?? "#1db954"

    const completedWorkout: CompletedWorkout = {
      id: `cw-${Date.now()}`,
      workoutId: activeSession?.workout_id ?? "",
      workoutName: mockWorkout?.name ?? customWorkout?.name ?? workoutType.name,
      workoutColor,
      category: workoutType.category,
      startedAt: activeSession?.started_at ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      xpEarned: result.xp_earned,
      exercises: activeSets.map((s) => ({
        exerciseId: s.exercise.id,
        exerciseName: s.exercise.name,
        sets: s.sets.map((set) => ({
          weight_kg: set.weight_kg,
          reps: set.reps,
          isPr: prIds.has(s.exercise.id),
        })),
      })),
      prsCount,
    }
    saveCompletedWorkout(completedWorkout)

    setXpResult(result)
  }

  function handleConfirmResult() {
    if (!xpResult) return
    const char = character ?? MOCK_CHARACTER

    // Apply XP
    applyXpGain(xpResult)

    // Apply attribute gains
    const workoutTypeId = activeSets[0]?.exercise.workout_type_id ?? "wt-1"
    const workoutType = MOCK_WORKOUT_TYPES.find((wt) => wt.id === workoutTypeId) ?? MOCK_WORKOUT_TYPES[0]
    const attrResult = calculateAttributeGains(char, workoutType.category)
    if (Object.keys(attrResult.updated).length > 0) {
      applyAttributeGains(attrResult.updated)
    }

    // Fire attribute level-up rewards
    for (const g of attrResult.gained) {
      if (g.leveledUp) {
        const ev = addRewardEvent({
          type: 'attribute_up',
          title: 'Atributo Aumentou!',
          subtitle: g.label,
          value: `${Math.floor(g.before)} → ${Math.floor(g.after)}`,
          icon: '📈',
        })
        pushReward(ev)
      }
    }

    // Fire XP/level-up rewards
    if (xpResult.level_up) {
      const ev = addRewardEvent({
        type: 'level_up',
        title: 'Level Up!',
        subtitle: `Nível ${xpResult.old_level} → ${xpResult.new_level}`,
        icon: '🎉',
      })
      pushReward(ev)
    }

    // Check and earn badges
    const history = getWorkoutHistory()
    const totalPrs = history.reduce((acc, w) => acc + (w.prsCount ?? 0), 0) + xpResult.prsCount
    const updatedChar = {
      ...char,
      ...attrResult.updated,
      level: xpResult.new_level,
    }
    const newBadges = checkAndEarnBadges({
      workoutCount: history.length + 1,
      totalPrs,
      level: updatedChar.level,
      diaryCount: getDiaryCount(),
      strength: updatedChar.strength,
      agility: updatedChar.agility,
      dexterity: updatedChar.dexterity,
      constitution: updatedChar.constitution,
      vitality: updatedChar.vitality,
    })

    for (const badge of newBadges) {
      const ev = addRewardEvent({
        type: 'badge',
        title: 'Badge Desbloqueada!',
        subtitle: badge.description,
        value: badge.name,
        icon: badge.icon,
      })
      pushReward(ev)
    }

    refreshBadges()
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
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
          <button
            onClick={() => { endSession(); router.push("/treinos") }}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "0.5rem 1rem",
              fontSize: "0.75rem",
              color: "#6a6a6a",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Exercises */}
      {activeSets.map((activeSet) => {
        const target = workoutTargets.find((t) => t.exerciseId === activeSet.exercise.id)
        const suggestion = suggestProgression(activeSet.exercise.id, target?.targetWeightKg ?? null)
        const suggestedWeight = activeSet.sets.length === 0 ? (suggestion.suggestedWeightKg ?? target?.targetWeightKg ?? null) : null
        const suggestedReps = activeSet.sets.length === 0 ? (suggestion.suggestedReps ?? target?.targetReps ?? 10) : undefined

        return (
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
            <div style={{ fontSize: "0.75rem", color: "#6a6a6a", marginBottom: target || activeSet.sets.length === 0 ? "0.5rem" : "0.75rem" }}>
              {activeSet.exercise.muscle_groups.join(", ")}
            </div>

            {/* Target + progression hint */}
            {(target || activeSet.sets.length === 0) && suggestion.note && (
              <div style={{
                background: "rgba(29,185,84,0.07)",
                border: "1px solid rgba(29,185,84,0.15)",
                borderRadius: 8,
                padding: "0.375rem 0.625rem",
                marginBottom: "0.625rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}>
                {target && (
                  <span style={{ fontSize: "0.75rem", color: "#1db954", fontWeight: 700, whiteSpace: "nowrap" }}>
                    🎯 {target.targetSets}×{target.targetReps ?? "—"}{target.targetWeightKg ? ` @ ${target.targetWeightKg}kg` : ""}
                  </span>
                )}
                {target && <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>}
                <span style={{ fontSize: "0.72rem", color: "#b3b3b3" }}>{suggestion.note}</span>
              </div>
            )}

            {activeSet.sets.length > 0 && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2rem 1fr 1fr auto auto",
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
                  <span />
                </div>
                {activeSet.sets.map((s, i) => (
                  <SetRow
                    key={i}
                    index={i}
                    weight={s.weight_kg}
                    reps={s.reps}
                    isPr={prExerciseIds.has(activeSet.exercise.id)}
                    onRemove={() => removeSet(activeSet.exercise.id, i)}
                  />
                ))}
              </div>
            )}

            <AddSetForm
              defaultWeight={suggestedWeight}
              defaultReps={suggestedReps}
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
        )
      })}

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
