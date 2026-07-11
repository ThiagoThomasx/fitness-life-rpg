"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/stores/useSessionStore"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { MOCK_CHARACTER, MOCK_WORKOUTS, MOCK_WORKOUT_TYPES } from "@/lib/mock/data"
import { calculateXpGain } from "@/lib/workout"
import { getExercisePersonalBest, saveCompletedWorkout, getWorkoutHistory } from "@/lib/workout-history"
import type { CompletedWorkout } from "@/lib/workout-history"
import type { XpGainResult } from "@/stores/useCharacterStore"
import { calculateAttributeGains } from "@/lib/attributes"
import { checkAndEarnBadges } from "@/lib/badges"
import { getDiaryCount } from "@/lib/daily-log"
import { addRewardEvent } from "@/lib/reward-events"
import { useRewardStore } from "@/stores/useRewardStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { getCustomWorkouts, type ExerciseTarget } from "@/lib/custom-workouts"
import { suggestProgression } from "@/lib/progression"
import { categoryColor } from "@/lib/theme-colors"
import { EmptyState } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SessionHeader } from "@/components/session/SessionHeader"
import { SessionExerciseCard } from "@/components/session/SessionExerciseCard"
import { ExercisePickerModal } from "@/components/session/ExercisePickerModal"
import { WorkoutSummaryModal } from "@/components/session/WorkoutSummaryModal"

// ─── Timer da sessão ──────────────────────────────────────────────────────────

function useTimer(running: boolean) {
  const tickTimer = useSessionStore((s) => s.tickTimer)
  useEffect(() => {
    if (!running) return
    const id = setInterval(tickTimer, 1000)
    return () => clearInterval(id)
  }, [running, tickTimer])
}

// ─── Página ───────────────────────────────────────────────────────────────────

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
  const [workoutName, setWorkoutName] = useState("Treino")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Guardas síncronas contra duplo clique (finalizar / confirmar resultado)
  const finishedRef = useRef(false)
  const confirmedRef = useRef(false)

  const hasSession = activeSession !== null

  useEffect(() => {
    if (!activeSession?.workout_id) return
    const custom = getCustomWorkouts().find((w) => w.id === activeSession.workout_id)
    const mock = MOCK_WORKOUTS.find((w) => w.id === activeSession.workout_id)
    setWorkoutTargets(custom?.targets ?? [])
    setWorkoutName(custom?.name ?? mock?.name ?? "Treino")
  }, [activeSession?.workout_id])

  useTimer(hasSession && xpResult === null)

  if (!hasSession) {
    return (
      <div className="page">
        <EmptyState
          icon="🏋️"
          title="Nenhuma sessão ativa"
          description="Escolha um treino para começar a registrar suas séries."
          action={
            <button type="button" className="btn btn--primary" onClick={() => router.push("/treinos")}>
              Escolher treino
            </button>
          }
        />
      </div>
    )
  }

  const totalSets = activeSets.reduce((acc, s) => acc + s.sets.length, 0)
  const exercisesDone = activeSets.filter((s) => s.sets.length > 0).length
  const alreadyAdded = activeSets.map((s) => s.exercise.id)

  function handleFinishRequest() {
    if (totalSets === 0 || xpResult) return
    const hasIncomplete = activeSets.some((s) => s.sets.length === 0)
    if (hasIncomplete) {
      setShowIncompleteDialog(true)
      return
    }
    finishWorkout()
  }

  function finishWorkout() {
    // Idempotência: bloqueia segunda execução (duplo clique salvaria histórico 2×)
    if (finishedRef.current) return
    finishedRef.current = true
    setShowIncompleteDialog(false)

    const workoutTypeId = activeSets[0]?.exercise.workout_type_id ?? "wt-1"
    const workoutType =
      MOCK_WORKOUT_TYPES.find((wt) => wt.id === workoutTypeId) ?? MOCK_WORKOUT_TYPES[0]
    const char = character ?? MOCK_CHARACTER

    // Detecta PRs comparando o maior peso por exercício com o recorde pessoal
    let prsCount = 0
    const prIds = new Set<string>()
    for (const activeSet of activeSets) {
      if (activeSet.sets.length === 0) continue
      const personalBest = getExercisePersonalBest(activeSet.exercise.id)
      const maxWeight = activeSet.sets.reduce((max, s) => Math.max(max, s.weight_kg), 0)
      if (personalBest > 0 && maxWeight > personalBest) {
        prsCount++
        prIds.add(activeSet.exercise.id)
      }
    }
    setPrExerciseIds(prIds)

    const result = calculateXpGain(workoutType, totalSets, elapsedSeconds, char, prsCount)

    // Persiste o treino no histórico
    const mockWorkout = MOCK_WORKOUTS.find((w) => w.id === activeSession!.workout_id)
    const customWorkout = getCustomWorkouts().find((w) => w.id === activeSession!.workout_id)
    const workoutColor = mockWorkout?.color ?? categoryColor(workoutType.category).fill

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

  function handleConfirmResult(destination: "/dashboard" | "/treinos") {
    if (!xpResult) return
    // Idempotência: aplicar XP/atributos/badges apenas uma vez
    if (confirmedRef.current) return
    confirmedRef.current = true
    setIsProcessing(true)

    const char = character ?? MOCK_CHARACTER

    // Aplica XP
    applyXpGain(xpResult)

    // Aplica ganhos de atributo
    const workoutTypeId = activeSets[0]?.exercise.workout_type_id ?? "wt-1"
    const workoutType =
      MOCK_WORKOUT_TYPES.find((wt) => wt.id === workoutTypeId) ?? MOCK_WORKOUT_TYPES[0]
    const attrResult = calculateAttributeGains(char, workoutType.category)
    if (Object.keys(attrResult.updated).length > 0) {
      applyAttributeGains(attrResult.updated)
    }

    // Recompensas de atributo
    for (const gain of attrResult.gained) {
      if (gain.leveledUp) {
        const ev = addRewardEvent({
          type: "attribute_up",
          title: "Atributo Aumentou!",
          subtitle: gain.label,
          value: `${Math.floor(gain.before)} → ${Math.floor(gain.after)}`,
          icon: "📈",
        })
        pushReward(ev)
      }
    }

    // Recompensa de level up
    if (xpResult.level_up) {
      const ev = addRewardEvent({
        type: "level_up",
        title: "Level Up!",
        subtitle: `Nível ${xpResult.old_level} → ${xpResult.new_level}`,
        icon: "🎉",
      })
      pushReward(ev)
    }

    // Verifica e concede badges
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
        type: "badge",
        title: "Badge Desbloqueada!",
        subtitle: badge.description,
        value: badge.name,
        icon: badge.icon,
      })
      pushReward(ev)
    }

    refreshBadges()
    endSession()
    router.push(destination)
  }

  function handleCancelConfirmed() {
    setShowCancelDialog(false)
    endSession()
    router.push("/treinos")
  }

  return (
    <div className="page">
      <SessionHeader
        workoutName={workoutName}
        elapsedSeconds={elapsedSeconds}
        totalSets={totalSets}
        exercisesDone={exercisesDone}
        totalExercises={activeSets.length}
        canFinish={totalSets > 0 && !xpResult}
        onFinish={handleFinishRequest}
        onCancel={() => setShowCancelDialog(true)}
      />

      {activeSets.map((activeSet) => {
        const target = workoutTargets.find((t) => t.exerciseId === activeSet.exercise.id)
        const suggestion = suggestProgression(activeSet.exercise.id, target?.targetWeightKg ?? null)

        return (
          <SessionExerciseCard
            key={activeSet.exercise.id}
            exercise={activeSet.exercise}
            sets={activeSet.sets}
            target={target}
            suggestion={suggestion}
            isPr={prExerciseIds.has(activeSet.exercise.id)}
            onAddSet={(weight, reps) =>
              addSet(activeSet.exercise.id, {
                exercise_id: activeSet.exercise.id,
                set_number: activeSet.sets.length + 1,
                weight_kg: weight,
                reps,
              })
            }
            onRemoveSet={(setIndex) => removeSet(activeSet.exercise.id, setIndex)}
            onRemoveExercise={() => removeExercise(activeSet.exercise.id)}
          />
        )
      })}

      <button type="button" className="add-exercise-tile" onClick={() => setShowPicker(true)}>
        <span aria-hidden="true">+</span> Adicionar exercício
      </button>

      {showPicker && (
        <ExercisePickerModal
          alreadyAdded={alreadyAdded}
          onPick={(exercise) => addExercise(exercise)}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showCancelDialog && (
        <ConfirmDialog
          title="Cancelar sessão?"
          description={`As ${totalSets} série${totalSets !== 1 ? "s" : ""} registrada${totalSets !== 1 ? "s" : ""} nesta sessão serão descartadas. Nenhum XP será concedido.`}
          confirmLabel="Descartar sessão"
          cancelLabel="Continuar treinando"
          isDanger
          onConfirm={handleCancelConfirmed}
          onCancel={() => setShowCancelDialog(false)}
        />
      )}

      {showIncompleteDialog && (
        <ConfirmDialog
          title="Exercícios sem séries"
          description="Alguns exercícios ainda não têm séries registradas. Eles serão salvos vazios no histórico. Finalizar mesmo assim?"
          confirmLabel="Finalizar treino"
          cancelLabel="Continuar treinando"
          onConfirm={finishWorkout}
          onCancel={() => setShowIncompleteDialog(false)}
        />
      )}

      {xpResult && (
        <WorkoutSummaryModal
          result={xpResult}
          durationSeconds={elapsedSeconds}
          totalExercises={activeSets.length}
          totalSets={totalSets}
          isProcessing={isProcessing}
          onConfirm={handleConfirmResult}
        />
      )}
    </div>
  )
}
