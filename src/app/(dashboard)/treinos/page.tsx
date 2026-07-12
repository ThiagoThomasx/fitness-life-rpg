"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSessionStore } from "@/stores/useSessionStore"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { MOCK_WORKOUTS, MOCK_CHARACTER } from "@/lib/mock/data"
import { EmptyState } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import {
  getCustomWorkouts,
  saveCustomWorkout,
  updateCustomWorkout,
  duplicateCustomWorkout,
  deleteCustomWorkout,
  toMockWorkoutShape,
  getAllExercises,
  type CustomWorkout,
} from "@/lib/custom-workouts"
import { getWorkoutHistory } from "@/lib/workout-history"
import type { WorkoutSession } from "@/types/database"
import { getPreferences } from "@/lib/preferences"
import { getWorkoutRecommendations, type WorkoutRecommendation } from "@/lib/recommendations"
import { rankWorkoutsByRecovery, getRecommendedWorkout, type WorkoutRecoveryInfo } from "@/lib/workout-recovery"
import { useMounted } from "@/hooks/useHasHydrated"
import { WorkoutCard, type AnyWorkout } from "@/components/workouts/WorkoutCard"
import { WorkoutFilters, filterByTime, type TimeFilter } from "@/components/workouts/WorkoutFilters"
import { ActiveSessionBanner } from "@/components/workouts/ActiveSessionBanner"
import { WorkoutsHeader } from "@/components/workouts/WorkoutsHeader"
import { WorkoutsHero } from "@/components/workouts/WorkoutsHero"
import { WorkoutEmptyState } from "@/components/workouts/WorkoutEmptyState"
import { WorkoutBuilderModal } from "@/components/workouts/WorkoutBuilderModal"
import { ExerciseLibrary } from "@/components/workouts/ExerciseLibrary"

export default function TreinosPage() {
  const router = useRouter()
  const { startSession, addExercise, activeSession } = useSessionStore()
  const character = useCharacterStore((s) => s.character) ?? MOCK_CHARACTER
  const mounted = useMounted()
  const [customWorkouts, setCustomWorkouts] = useState<AnyWorkout[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")
  const [recommendations, setRecommendations] = useState<WorkoutRecommendation[]>([])
  const [deletingWorkout, setDeletingWorkout] = useState<AnyWorkout | null>(null)
  const [pendingStart, setPendingStart] = useState<AnyWorkout | null>(null)
  const [totalExercises, setTotalExercises] = useState(0)
  const [lastByWorkoutId, setLastByWorkoutId] = useState<Record<string, string>>({})
  const startingRef = useRef(false)

  const loadWorkouts = useCallback(() => {
    const allExercises = getAllExercises()
    const stored = getCustomWorkouts()
    setCustomWorkouts(stored.map((cw) => toMockWorkoutShape(cw, allExercises) as AnyWorkout))
    setTotalExercises(allExercises.length)

    const lastMap: Record<string, string> = {}
    for (const completed of getWorkoutHistory()) {
      if (!(completed.workoutId in lastMap)) lastMap[completed.workoutId] = completed.completedAt
    }
    setLastByWorkoutId(lastMap)
  }, [])

  useEffect(() => {
    loadWorkouts()
    setRecommendations(getWorkoutRecommendations(getPreferences(), 3))
  }, [loadWorkouts])

  function startWorkout(workout: AnyWorkout) {
    // Bloqueia duplo clique antes da navegação para /sessao
    if (startingRef.current) return
    startingRef.current = true
    const session: WorkoutSession = {
      id: `session-${Date.now()}`,
      workout_id: workout.id,
      user_id: "mock-user-id",
      started_at: new Date().toISOString(),
      completed_at: null,
      xp_earned: 0,
      intensity_multiplier: 1,
      notes: null,
    }
    startSession(session)
    for (const ex of workout.exercises) addExercise(ex)
    router.push("/sessao")
  }

  function handleStartRequest(workout: AnyWorkout) {
    if (activeSession) {
      setPendingStart(workout)
      return
    }
    startWorkout(workout)
  }

  function handleSaveWorkout(data: Omit<CustomWorkout, "id" | "createdAt" | "updatedAt">) {
    if (editingWorkout) {
      updateCustomWorkout(editingWorkout.id, data)
    } else {
      saveCustomWorkout(data)
    }
    loadWorkouts()
    setShowBuilder(false)
    setEditingWorkout(null)
  }

  function handleEdit(workout: AnyWorkout) {
    const raw = getCustomWorkouts().find((w) => w.id === workout.id)
    if (raw) {
      setEditingWorkout(raw)
      setShowBuilder(true)
    }
  }

  function handleDuplicate(id: string) {
    duplicateCustomWorkout(id)
    loadWorkouts()
  }

  function confirmDeleteWorkout() {
    if (!deletingWorkout) return
    deleteCustomWorkout(deletingWorkout.id)
    loadWorkouts()
    setDeletingWorkout(null)
  }

  const recommendedIds = new Set(recommendations.map((r) => r.workout.id))
  const topRecommendation = recommendations[0] ?? null

  const allWorkoutsForRecovery = useMemo(
    () => [...customWorkouts, ...(MOCK_WORKOUTS as AnyWorkout[])],
    [customWorkouts]
  )
  const activeWorkoutId = activeSession?.workout_id ?? null
  // Gateado por `mounted`: getWorkoutHistory()/getAllExercises() leem localStorage,
  // que não existe no SSR. Calcular isso incondicionalmente faria o primeiro
  // render do cliente (hidratação) já sair reordenado, divergindo do HTML do
  // servidor e disparando um hydration mismatch (mesma classe de bug do Sprint 9).
  const recoveryByWorkoutId = useMemo(() => {
    if (!mounted) return {} as Record<string, WorkoutRecoveryInfo>
    const ranked = rankWorkoutsByRecovery(allWorkoutsForRecovery, { activeWorkoutId })
    const map: Record<string, WorkoutRecoveryInfo> = {}
    for (const r of ranked) map[r.workoutId] = r
    return map
  }, [mounted, allWorkoutsForRecovery, activeWorkoutId])
  const topRecoveryPick = useMemo(
    () => (mounted ? getRecommendedWorkout(allWorkoutsForRecovery, { activeWorkoutId }) : null),
    [mounted, allWorkoutsForRecovery, activeWorkoutId]
  )

  function sortByRecovery(list: AnyWorkout[]): AnyWorkout[] {
    if (!mounted) return list
    return [...list].sort(
      (a, b) => (recoveryByWorkoutId[b.id]?.score ?? 0) - (recoveryByWorkoutId[a.id]?.score ?? 0)
    )
  }

  const visibleCustom = sortByRecovery(filterByTime(customWorkouts, timeFilter))
  const visibleTemplates = sortByRecovery(filterByTime(MOCK_WORKOUTS as AnyWorkout[], timeFilter))
  const totalVisible = visibleCustom.length + visibleTemplates.length
  const totalWorkouts = customWorkouts.length + MOCK_WORKOUTS.length

  const activeWorkoutName = activeSession
    ? [...customWorkouts, ...(MOCK_WORKOUTS as AnyWorkout[])].find(
        (w) => w.id === activeSession.workout_id
      )?.name ?? "Treino em andamento"
    : ""

  if (showLibrary) {
    return <ExerciseLibrary onClose={() => { setShowLibrary(false); loadWorkouts() }} />
  }

  return (
    <div className="page">
      <WorkoutsHeader
        totalVisible={totalVisible}
        onOpenLibrary={() => setShowLibrary(true)}
        onCreateWorkout={() => { setEditingWorkout(null); setShowBuilder(true) }}
      />

      {/* ─── Sessão ativa (prioridade máxima) ─────────────────────────── */}
      {activeSession && <ActiveSessionBanner workoutName={activeWorkoutName} />}

      {/* ─── Hero: saudação, resumo e recomendação ───────────────────── */}
      {!activeSession && (
        <WorkoutsHero
          characterName={character.name}
          totalWorkouts={totalWorkouts}
          totalExercises={totalExercises}
          recommendation={topRecommendation}
          onStart={handleStartRequest}
        />
      )}

      {/* ─── Filtro de duração ─────────────────────────────────────── */}
      <WorkoutFilters value={timeFilter} onChange={setTimeFilter} />

      {/* ─── Treinos personalizados ────────────────────────────────── */}
      <section aria-labelledby="custom-workouts-title">
        <div className="section-header">
          <h2 id="custom-workouts-title" className="section-header__title">Meus treinos</h2>
          {visibleCustom.length > 0 && (
            <span className="numeric text-xs text-muted">
              {visibleCustom.length} treino{visibleCustom.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {visibleCustom.length === 0 ? (
          customWorkouts.length === 0 ? (
            <WorkoutEmptyState onCreate={() => { setEditingWorkout(null); setShowBuilder(true) }} />
          ) : (
            <EmptyState
              icon="⏱️"
              title="Nenhum treino personalizado neste filtro"
              description="Ajuste o filtro de duração para ver seus treinos."
            />
          )
        ) : (
          <div className="workout-list">
            {visibleCustom.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onStart={() => handleStartRequest(workout)}
                onDelete={() => setDeletingWorkout(workout)}
                onEdit={() => handleEdit(workout)}
                onDuplicate={() => handleDuplicate(workout.id)}
                lastCompletedAt={lastByWorkoutId[workout.id]}
                recovery={recoveryByWorkoutId[workout.id]}
                isTopRecoveryPick={workout.id === topRecoveryPick?.workoutId}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Templates ─────────────────────────────────────────────── */}
      <section aria-labelledby="template-workouts-title">
        <div className="section-header">
          <h2 id="template-workouts-title" className="section-header__title">Templates</h2>
          <span className="numeric text-xs text-muted">
            {visibleTemplates.length} treino{visibleTemplates.length !== 1 ? "s" : ""}
          </span>
        </div>

        {visibleTemplates.length === 0 ? (
          <EmptyState
            icon="🏋️"
            title="Nenhum template neste filtro"
            description="Ajuste o filtro de duração para ver os templates."
          />
        ) : (
          <div className="workout-list">
            {visibleTemplates.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onStart={() => handleStartRequest(workout)}
                isRecommended={recommendedIds.has(workout.id)}
                lastCompletedAt={lastByWorkoutId[workout.id]}
                recovery={recoveryByWorkoutId[workout.id]}
                isTopRecoveryPick={workout.id === topRecoveryPick?.workoutId}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Modais ────────────────────────────────────────────────── */}
      {showBuilder && (
        <WorkoutBuilderModal
          initial={editingWorkout ?? undefined}
          onSave={handleSaveWorkout}
          onClose={() => { setShowBuilder(false); setEditingWorkout(null) }}
        />
      )}

      {deletingWorkout && (
        <ConfirmDialog
          title="Excluir treino?"
          description={`"${deletingWorkout.name}" será removido permanentemente. O histórico de sessões já concluídas não é afetado.`}
          confirmLabel="Excluir"
          isDanger
          onConfirm={confirmDeleteWorkout}
          onCancel={() => setDeletingWorkout(null)}
        />
      )}

      {pendingStart && (
        <ConfirmDialog
          title="Você já tem uma sessão ativa"
          description={`Iniciar "${pendingStart.name}" descarta a sessão em andamento e as séries registradas nela. Prefere continuar a sessão atual?`}
          confirmLabel="Descartar e iniciar"
          cancelLabel="Voltar"
          isDanger
          onConfirm={() => { const w = pendingStart; setPendingStart(null); startWorkout(w) }}
          onCancel={() => setPendingStart(null)}
        />
      )}
    </div>
  )
}
