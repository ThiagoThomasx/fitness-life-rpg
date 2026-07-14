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
import { generateRecommendation } from "@/lib/workout-intelligence"
import { detectExercisePrs, getLastExecutionSummary, type ExercisePrDetection } from "@/lib/exercise-records"
import { categoryColor } from "@/lib/theme-colors"
import { EmptyState } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SessionHeader } from "@/components/session/SessionHeader"
import { SessionExerciseCard } from "@/components/session/SessionExerciseCard"
import { ExercisePickerModal } from "@/components/session/ExercisePickerModal"
import { WorkoutSummaryModal } from "@/components/session/WorkoutSummaryModal"
import { ReadinessCheckIn } from "@/components/session/ReadinessCheckIn"
import { ReadinessCard } from "@/components/session/ReadinessCard"
import { SessionAdjustmentPanel } from "@/components/session/SessionAdjustmentPanel"
import { saveCheckIn } from "@/lib/readiness-check-ins"
import type { WorkoutReadinessCheckIn } from "@/lib/readiness-check-ins"
import {
  calculateReadiness,
  calculateSessionOutcome,
  formatOutcome,
} from "@/lib/workout-readiness"
import type { WorkoutReadinessResult, ReadinessOutcome } from "@/lib/workout-readiness"
import { getExerciseStatus } from "@/lib/workout-intelligence"
import {
  applyAdjustmentToExercise,
  toSnapshot,
  isOriginalAdjustment,
  ORIGINAL_ADJUSTMENT,
} from "@/lib/session-adjustments"
import type { SessionAdjustment } from "@/lib/session-adjustments"

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
    sessionAdjustment,
    setSessionAdjustment,
  } = useSessionStore()

  const { character, applyXpGain, applyAttributeGains } = useCharacterStore()
  const pushReward = useRewardStore((s) => s.pushReward)
  const refreshBadges = useBadgeStore((s) => s.refreshBadges)

  const [showPicker, setShowPicker] = useState(false)
  const [xpResult, setXpResult] = useState<XpGainResult | null>(null)
  const [prExerciseIds, setPrExerciseIds] = useState<Set<string>>(new Set())
  const [recordEvents, setRecordEvents] = useState<Array<{ exerciseName: string; label: string }>>([])
  const [workoutTargets, setWorkoutTargets] = useState<ExerciseTarget[]>([])
  const [workoutName, setWorkoutName] = useState("Treino")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Sprint 14: readiness check-in state
  const [checkInPhase, setCheckInPhase] = useState<"check_in" | "result" | "training">("check_in")
  const [activeCheckIn, setActiveCheckIn] = useState<WorkoutReadinessCheckIn | null>(null)
  const [readinessResult, setReadinessResult] = useState<WorkoutReadinessResult | null>(null)
  const [sessionOutcome, setSessionOutcome] = useState<ReadinessOutcome | null>(null)

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

  function handleCheckInSubmit(checkIn: WorkoutReadinessCheckIn) {
    saveCheckIn(checkIn)
    setActiveCheckIn(checkIn)
    const result = calculateReadiness({
      checkIn,
      workoutExerciseIds: activeSets.map((s) => s.exercise.id),
    })
    setReadinessResult(result)
    setCheckInPhase("result")
  }

  function handleSkipCheckIn() {
    const result = calculateReadiness({
      checkIn: null,
      workoutExerciseIds: activeSets.map((s) => s.exercise.id),
    })
    setReadinessResult(result)
    setCheckInPhase("training")
  }

  function handleStartTraining() {
    setCheckInPhase("training")
  }

  function handleEditCheckIn() {
    setCheckInPhase("check_in")
  }

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

    // Sprint 12 — detecção ampliada de recordes (peso/reps/volume/primeira vez).
    // Aditiva: não altera prsCount nem os argumentos passados a calculateXpGain abaixo.
    const exerciseRecordFlags = new Map<string, ExercisePrDetection>()
    const newRecordEvents: Array<{ exerciseName: string; label: string }> = []
    for (const activeSet of activeSets) {
      if (activeSet.sets.length === 0) continue
      const flags = detectExercisePrs(activeSet.exercise.id, activeSet.sets)
      exerciseRecordFlags.set(activeSet.exercise.id, flags)
      if (flags.isFirstTime) newRecordEvents.push({ exerciseName: activeSet.exercise.name, label: "Primeira vez!" })
      else if (flags.isWeightPr) newRecordEvents.push({ exerciseName: activeSet.exercise.name, label: "Novo peso máximo" })
      else if (flags.isVolumePr) newRecordEvents.push({ exerciseName: activeSet.exercise.name, label: "Novo volume máximo" })
      else if (flags.isRepsPr) newRecordEvents.push({ exerciseName: activeSet.exercise.name, label: "Mais repetições" })
    }
    setRecordEvents(newRecordEvents)

    const result = calculateXpGain(workoutType, totalSets, elapsedSeconds, char, prsCount)

    // Persiste o treino no histórico
    const mockWorkout = MOCK_WORKOUTS.find((w) => w.id === activeSession!.workout_id)
    const customWorkout = getCustomWorkouts().find((w) => w.id === activeSession!.workout_id)
    const workoutColor = mockWorkout?.color ?? categoryColor(workoutType.category).fill

    // Sprint 14: link check-in and compute session outcome
    const regressingCount = activeSets.filter(
      (s) => getExerciseStatus(s.exercise.id) === "regressing"
    ).length
    const improvingCount = activeSets.filter(
      (s) => getExerciseStatus(s.exercise.id) === "improving"
    ).length
    const sessionVol = activeSets.reduce(
      (sum, s) => sum + s.sets.reduce((acc, set) => acc + set.weight_kg * set.reps, 0),
      0
    )
    if (readinessResult) {
      const outcome = calculateSessionOutcome({
        readinessLevel: readinessResult.level,
        actualVolume: sessionVol,
        expectedVolume: sessionVol, // conservative: use actual as expected baseline
        regressingCount,
        improvingCount,
      })
      setSessionOutcome(outcome)
    }

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
      exercises: activeSets.map((s) => {
        const flags = exerciseRecordFlags.get(s.exercise.id)
        return {
          exerciseId: s.exercise.id,
          exerciseName: s.exercise.name,
          sets: s.sets.map((set) => ({
            weight_kg: set.weight_kg,
            reps: set.reps,
            isPr: prIds.has(s.exercise.id),
          })),
          isWeightPr: flags?.isWeightPr ?? false,
          isRepsPr: flags?.isRepsPr ?? false,
          isVolumePr: flags?.isVolumePr ?? false,
          isFirstTime: flags?.isFirstTime ?? false,
          estimated1RMKg: flags?.estimated1RMKg ?? null,
        }
      }),
      prsCount,
      checkInId: activeCheckIn?.id,
      appliedSessionAdjustment: isOriginalAdjustment(sessionAdjustment)
        ? undefined
        : toSnapshot(sessionAdjustment),
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

    // Recompensa de novo recorde pessoal (Sprint 12) — aditiva, não afeta badges/XP acima.
    for (const rec of recordEvents) {
      const ev = addRewardEvent({
        type: "pr",
        title: "🏆 Novo Recorde!",
        subtitle: `${rec.exerciseName} — ${rec.label}`,
        icon: "🏆",
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

  // Compute readiness hints per exercise (only when readiness is available and not high)
  function getReadinessHint(exerciseId: string): string | null {
    if (!readinessResult || readinessResult.level === "high") return null
    const status = getExerciseStatus(exerciseId)
    if (readinessResult.level === "low") {
      if (status === "regressing") return "Evite perseguir PR. Use a primeira série como referência."
      if (status === "stagnant") return "Consolide a carga atual antes de tentar aumentar."
      return "Hoje pode ser um dia mais leve neste exercício."
    }
    // moderate
    if (status === "regressing") return "Queda recente — priorize técnica."
    return null
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

      {/* Sprint 14: check-in phase */}
      {checkInPhase === "check_in" && !xpResult && (
        <ReadinessCheckIn
          workoutId={activeSession?.workout_id}
          onSubmit={handleCheckInSubmit}
          onSkip={handleSkipCheckIn}
        />
      )}

      {/* Sprint 14: readiness result phase */}
      {checkInPhase === "result" && readinessResult && !xpResult && (
        <div>
          <ReadinessCard
            result={readinessResult}
            onEditCheckIn={handleEditCheckIn}
          />
          {readinessResult.level !== "insufficient_data" && (
            <button
              type="button"
              className="btn btn--primary"
              style={{ width: "100%", marginBottom: "var(--space-4)" }}
              onClick={handleStartTraining}
            >
              Iniciar treino
            </button>
          )}
        </div>
      )}

      {/* Sprint 15: adjustment panel (shown after check-in result) */}
      {checkInPhase === "training" && !xpResult && (
        <SessionAdjustmentPanel
          readinessResult={readinessResult}
          adjustment={sessionAdjustment}
          exerciseCount={activeSets.length}
          onApply={(adj: SessionAdjustment) => setSessionAdjustment(adj)}
          onReset={() => setSessionAdjustment(ORIGINAL_ADJUSTMENT)}
        />
      )}

      {/* Sprint 14: training phase — exercises */}
      {checkInPhase === "training" && activeSets.map((activeSet) => {
        const target = workoutTargets.find((t) => t.exerciseId === activeSet.exercise.id)
        const recommendation = generateRecommendation(activeSet.exercise.id)
        const lastExecution = getLastExecutionSummary(activeSet.exercise.id)
        const readinessHint = getReadinessHint(activeSet.exercise.id)
        const adjustedTarget = applyAdjustmentToExercise(
          activeSet.exercise.id,
          target?.targetWeightKg ?? undefined,
          target?.targetSets,
          undefined,
          sessionAdjustment
        )

        return (
          <SessionExerciseCard
            key={activeSet.exercise.id}
            exercise={activeSet.exercise}
            sets={activeSet.sets}
            target={target}
            recommendation={recommendation}
            isPr={prExerciseIds.has(activeSet.exercise.id)}
            lastExecution={lastExecution}
            readinessHint={readinessHint}
            adjustedTarget={adjustedTarget}
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

      {checkInPhase === "training" && (
        <button type="button" className="add-exercise-tile" onClick={() => setShowPicker(true)}>
          <span aria-hidden="true">+</span> Adicionar exercício
        </button>
      )}

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
          sessionOutcomeMessage={sessionOutcome ? formatOutcome(sessionOutcome) : null}
          appliedAdjustment={
            isOriginalAdjustment(sessionAdjustment) ? null : toSnapshot(sessionAdjustment)
          }
          readinessLevel={readinessResult?.level ?? null}
          onConfirm={handleConfirmResult}
        />
      )}
    </div>
  )
}
