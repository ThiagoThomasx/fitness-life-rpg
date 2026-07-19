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
