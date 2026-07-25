// Fundação de execução (Sprint 20 — Parte 4A).
// Ponte pura entre o Planner (planned-workouts.ts) e a sessão ativa
// (useSessionStore). Sem UI, sem I/O em localStorage — só os tipos e as
// funções que decidem "pode iniciar?" e "como vira uma sessão ativa?".
// Substituição explícita, extras, pausa/retomada e conclusão transacional
// ficam para partes futuras da Sprint 20 (4B/4C).

import type { Exercise } from '@/types/database'
import type { PlannedWorkout } from './planned-workouts'

// ─── Origem da sessão ativa ───────────────────────────────────────────────────

export type ActiveWorkoutSourceType = 'free' | 'planned'

export interface ActiveWorkoutSource {
  type: ActiveWorkoutSourceType
  plannedWorkoutId?: string
  programId?: string
  programVersion?: number
  programWeekId?: string
  programWeekNumber?: number
  trainingBlockId?: string
  templateId?: string
  templateVersion?: number
}

export const FREE_WORKOUT_SOURCE: ActiveWorkoutSource = { type: 'free' }

// ─── Snapshot planejado (imutável após início) ───────────────────────────────

export interface PlannedExerciseTargets {
  sets?: number
  reps?: string
  loadKg?: number
  durationSeconds?: number
  distanceMeters?: number
  restSeconds?: number
  rir?: number
  rpe?: number
  tempo?: string
}

/** Formata os targets planejados para exibição (Fase 6) — nunca mostra um campo ausente como zero. */
export function formatPlannedTargets(targets: PlannedExerciseTargets): string {
  const parts: string[] = []
  if (targets.sets && targets.reps) parts.push(`${targets.sets}x${targets.reps}`)
  else if (targets.sets) parts.push(`${targets.sets} séries`)
  else if (targets.reps) parts.push(targets.reps)
  if (targets.loadKg) parts.push(`${targets.loadKg}kg`)
  if (targets.durationSeconds) parts.push(`${targets.durationSeconds}s`)
  if (targets.distanceMeters) parts.push(`${targets.distanceMeters}m`)
  if (targets.restSeconds) parts.push(`descanso ${targets.restSeconds}s`)
  if (targets.rir !== undefined) parts.push(`RIR ${targets.rir}`)
  if (targets.rpe !== undefined) parts.push(`RPE ${targets.rpe}`)
  if (targets.tempo) parts.push(`tempo ${targets.tempo}`)
  return parts.length > 0 ? parts.join(' · ') : 'Sem alvo definido'
}

export interface PlannedExecutionExercise {
  id: string
  exerciseId?: string
  exerciseName: string
  targets: PlannedExerciseTargets
  notes?: string
}

export interface PlannedWorkoutExecutionSnapshot {
  plannedWorkoutId: string
  name: string
  exercises: PlannedExecutionExercise[]
  estimatedDurationMinutes?: number
  notes?: string
  capturedAt: string
}

/** Congela o `templateSnapshot` do PlannedWorkout no formato de execução. Nunca lê o template/programa de origem novamente. */
export function buildPlannedExecutionSnapshot(planned: PlannedWorkout): PlannedWorkoutExecutionSnapshot {
  return {
    plannedWorkoutId: planned.id,
    name: planned.name,
    exercises: planned.templateSnapshot.exerciseBlocks.map((block) => ({
      id: block.id,
      exerciseId: block.exercise.exerciseId,
      exerciseName: block.exercise.exerciseName,
      targets: {
        sets: block.exercise.sets,
        reps: block.exercise.reps,
        loadKg: block.exercise.loadKg,
        durationSeconds: block.exercise.durationSeconds,
        distanceMeters: block.exercise.distanceMeters,
        restSeconds: block.exercise.restSeconds,
        rir: block.exercise.rir,
        rpe: block.exercise.rpe,
        tempo: block.exercise.tempo,
      },
      notes: block.exercise.notes,
    })),
    estimatedDurationMinutes: planned.templateSnapshot.estimatedDurationMinutes,
    notes: planned.notes,
    capturedAt: new Date().toISOString(),
  }
}

/** Origem/vínculo com programa, semana e bloco — preservado na sessão ativa e depois no histórico. */
export function buildSourceFromPlannedWorkout(planned: PlannedWorkout): ActiveWorkoutSource {
  return {
    type: 'planned',
    plannedWorkoutId: planned.id,
    programId: planned.source?.programId,
    programVersion: planned.source?.programVersion,
    programWeekId: planned.source?.programWeekId,
    programWeekNumber: planned.source?.programWeekNumber,
    trainingBlockId: planned.source?.trainingBlockId,
    templateId: planned.source?.templateId,
    templateVersion: planned.source?.templateVersion,
  }
}

// ─── Resolução de exercício para a sessão ativa ──────────────────────────────

/**
 * A sessão ativa registra séries contra um `Exercise` completo (DB shape),
 * mas um exercício planejado só garante `exerciseName` (+ `exerciseId`
 * opcional). Quando o id não resolve (exercício de template sem vínculo,
 * ou removido depois), cai num stub mínimo — a execução continua funcionando
 * e o nome planejado nunca se perde.
 */
export function resolveExecutionExercise(
  exec: PlannedExecutionExercise,
  allExercises: Exercise[]
): Exercise {
  const found = exec.exerciseId ? allExercises.find((e) => e.id === exec.exerciseId) : undefined
  if (found) return found
  return {
    id: exec.exerciseId ?? exec.id,
    workout_type_id: '',
    name: exec.exerciseName,
    muscle_groups: [],
    equipment: [],
    instructions: null,
  }
}

// ─── Guard de início ──────────────────────────────────────────────────────────

export type StartPlannedWorkoutBlockReason = 'not_found' | 'already_active' | 'not_pending'

export interface StartPlannedWorkoutCheck {
  ok: boolean
  reason?: StartPlannedWorkoutBlockReason
}

/**
 * Único ponto de decisão sobre "pode iniciar pelo Planner?" — reutilizável
 * por qualquer entrada futura (hoje só o Planner, mas evita reimplementar a
 * checagem em cada tela, como já acontece entre /treinos e o Planner).
 */
export function canStartPlannedWorkout(
  planned: PlannedWorkout | null,
  hasActiveSession: boolean
): StartPlannedWorkoutCheck {
  if (!planned) return { ok: false, reason: 'not_found' }
  if (hasActiveSession) return { ok: false, reason: 'already_active' }
  if (planned.status !== 'pending') return { ok: false, reason: 'not_pending' }
  return { ok: true }
}

// ─── Adaptações de execução (Sprint 20 — Parte 4B) ───────────────────────────
// Substituição explícita, extras e "não realizado" pertencem só à sessão
// ativa — nunca ao snapshot planejado, ao template ou ao programa.

export type ActiveExerciseSource = 'free' | 'planned' | 'substitution' | 'extra'

/**
 * `pending`/`in_progress`/`completed` são sempre derivados dos sets
 * registrados (`deriveExerciseExecutionStatus`) — nunca persistidos, para
 * não criar uma segunda fonte de verdade que possa divergir dos sets reais.
 * Só `skipped` é um estado que os sets sozinhos não conseguem expressar, e é
 * o único valor que a sessão ativa realmente persiste neste campo.
 */
export type ActiveExerciseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export type ExerciseSubstitutionReason =
  | 'equipment'
  | 'availability'
  | 'comfort'
  | 'pain'
  | 'preference'
  | 'variation'
  | 'other'

export interface ActiveExerciseSubstitution {
  plannedExerciseId: string
  plannedExerciseName: string
  replacementExerciseId?: string
  replacementExerciseName: string
  reason?: ExerciseSubstitutionReason
  note?: string
  substitutedAt: string
}

/** Deriva o status de exibição a partir dos sets — só `skipped` é lido de `persistedStatus` (explícito, nunca inferido). */
export function deriveExerciseExecutionStatus(
  setsCount: number,
  plannedTargetSets: number | undefined,
  persistedStatus: ActiveExerciseStatus | undefined
): ActiveExerciseStatus {
  if (persistedStatus === 'skipped') return 'skipped'
  if (setsCount === 0) return 'pending'
  if (plannedTargetSets && setsCount >= plannedTargetSets) return 'completed'
  return 'in_progress'
}

/** Reordenação pura da sessão ativa — nunca toca no snapshot planejado (Fase 25/27). */
export function moveActiveExercise<T>(items: T[], index: number, direction: 'up' | 'down'): T[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || index >= items.length || targetIndex < 0 || targetIndex >= items.length) {
    return items
  }
  const next = [...items]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

// ─── Integridade local (interna, sem UI nesta fatia — Fase 49/50) ───────────

export interface ActiveWorkoutExerciseLike {
  exercise: { id: string }
  sets: unknown[]
  source?: ActiveExerciseSource
  plannedExerciseId?: string
  executionStatus?: ActiveExerciseStatus
}

export interface ActiveWorkoutAdaptationIntegrity {
  orphanSubstitutions: string[]
  duplicatePlannedExerciseLinks: string[]
  invalidExtraExercises: string[]
  skippedExercisesWithCompletedSets: string[]
}

/**
 * Relatório interno de integridade da sessão ativa. Não é exposto em UI
 * nesta fatia (isso é 4C/4D) — serve para os testes garantirem que as ações
 * novas (substituir/extra/skip) nunca deixam a sessão num estado incoerente.
 */
export function validateActiveWorkoutAdaptations(
  exercises: ActiveWorkoutExerciseLike[]
): ActiveWorkoutAdaptationIntegrity {
  const orphanSubstitutions: string[] = []
  const invalidExtraExercises: string[] = []
  const skippedExercisesWithCompletedSets: string[] = []
  const plannedIdCounts = new Map<string, number>()

  for (const ex of exercises) {
    if (ex.source === 'substitution' && !ex.plannedExerciseId) {
      orphanSubstitutions.push(ex.exercise.id)
    }
    if (ex.source === 'extra' && ex.plannedExerciseId) {
      invalidExtraExercises.push(ex.exercise.id)
    }
    if (ex.executionStatus === 'skipped' && ex.sets.length > 0) {
      skippedExercisesWithCompletedSets.push(ex.exercise.id)
    }
    if (ex.plannedExerciseId) {
      plannedIdCounts.set(ex.plannedExerciseId, (plannedIdCounts.get(ex.plannedExerciseId) ?? 0) + 1)
    }
  }

  const duplicatePlannedExerciseLinks = Array.from(plannedIdCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id)

  return { orphanSubstitutions, duplicatePlannedExerciseLinks, invalidExtraExercises, skippedExercisesWithCompletedSets }
}
