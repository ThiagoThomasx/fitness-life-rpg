// Blocos de treino, progressão manual e deload planejado (Sprint 20 — Parte 2A).
//
// Este módulo NUNCA prescreve. Toda progressão (carga, volume, esforço,
// deload) é definida pelo usuário — as funções aqui só modelam, resolvem e
// validam essas decisões. Nenhuma função calcula um valor "ideal" ou aplica
// uma mudança sem que o chamador (UI) tenha montado o input explicitamente.
//
// Ordem de resolução de uma sessão (ver `resolveProgramSessionForWeek`):
//   snapshot do template (congelado no programa)
//     → override da semana (se existir)
//     → estado final resolvido
// Nada aqui persiste o resultado — `ResolvedProgramSession` é sempre
// recalculado a partir do programa + overrides, nunca armazenado.

import type {
  TrainingProgram,
  TrainingProgramSession,
  TrainingProgramWeek,
  WorkoutTemplateSnapshot,
} from './training-programs'
import type { WorkoutTemplateExerciseBlock } from './workout-templates'
import { roundWeightDown } from './session-adjustments'

// ─── Blocks ───────────────────────────────────────────────────────────────────

export type TrainingBlockObjective =
  | 'base'
  | 'accumulation'
  | 'intensification'
  | 'strength'
  | 'hypertrophy'
  | 'conditioning'
  | 'technique'
  | 'recovery'
  | 'deload'
  | 'test'
  | 'custom'

export const TRAINING_BLOCK_OBJECTIVE_LABELS: Record<TrainingBlockObjective, string> = {
  base: 'Base',
  accumulation: 'Acúmulo',
  intensification: 'Intensificação',
  strength: 'Força',
  hypertrophy: 'Hipertrofia',
  conditioning: 'Condicionamento',
  technique: 'Técnica',
  recovery: 'Recuperação',
  deload: 'Deload',
  test: 'Teste',
  custom: 'Personalizado',
}

export interface TrainingBlock {
  id: string
  name: string
  description?: string
  objective?: TrainingBlockObjective
  startWeek: number
  endWeek: number
  colorToken?: string
  notes?: string
}

export interface TrainingBlockValidationError {
  type: 'invalid_range' | 'overlap'
  blockId: string
  message: string
}

/** Valida contiguidade/intervalo e sobreposição — não resolve silenciosamente. */
export function validateTrainingBlocks(
  blocks: TrainingBlock[],
  totalWeeks: number
): { ok: boolean; errors: TrainingBlockValidationError[] } {
  const errors: TrainingBlockValidationError[] = []

  for (const block of blocks) {
    if (block.startWeek > block.endWeek) {
      errors.push({
        type: 'invalid_range',
        blockId: block.id,
        message: `O bloco "${block.name}" tem semana inicial maior que a final.`,
      })
      continue
    }
    if (block.startWeek < 1 || block.endWeek > totalWeeks) {
      errors.push({
        type: 'invalid_range',
        blockId: block.id,
        message: `O bloco "${block.name}" está fora do intervalo de semanas do programa.`,
      })
    }
  }

  const validRanged = blocks.filter((b) => b.startWeek <= b.endWeek)
  const sorted = [...validRanged].sort((a, b) => a.startWeek - b.startWeek)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startWeek <= sorted[i - 1].endWeek) {
      errors.push({
        type: 'overlap',
        blockId: sorted[i].id,
        message: `O bloco "${sorted[i].name}" sobrepõe "${sorted[i - 1].name}".`,
      })
      errors.push({
        type: 'overlap',
        blockId: sorted[i - 1].id,
        message: `O bloco "${sorted[i - 1].name}" sobrepõe "${sorted[i].name}".`,
      })
    }
  }

  return { ok: errors.length === 0, errors }
}

// ─── Progression settings ──────────────────────────────────────────────────────

export interface ProgramProgressionSettings {
  mode: 'none' | 'manual'
  showProgressionSummary: boolean
  defaultLoadUnit: 'kg'
}

export const DEFAULT_PROGRESSION_SETTINGS: ProgramProgressionSettings = {
  mode: 'none',
  showProgressionSummary: false,
  defaultLoadUnit: 'kg',
}

// ─── Overrides ──────────────────────────────────────────────────────────────────

export interface ProgramExerciseOverride {
  exerciseBlockId: string
  /** Referência de conveniência ao exercício do catálogo — pode ser ausente (exercício customizado sem ID de catálogo), assim como em WorkoutTemplateExercise. */
  exerciseId?: string
  sets?: number
  reps?: string
  loadKg?: number
  durationSeconds?: number
  distanceMeters?: number
  restSeconds?: number
  rir?: number
  rpe?: number
  tempo?: string
  notes?: string
  action?: 'modify' | 'skip'
}

export interface ProgramSessionOverride {
  id: string
  weekId: string
  sessionId: string
  exerciseOverrides: ProgramExerciseOverride[]
  sessionNotes?: string
  estimatedDurationMinutes?: number
  isDeload?: boolean
  createdAt: string
  updatedAt: string
}

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function findProgramSessionOverride(
  overrides: ProgramSessionOverride[] | undefined,
  weekId: string,
  sessionId: string
): ProgramSessionOverride | undefined {
  return overrides?.find((o) => o.weekId === weekId && o.sessionId === sessionId)
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export interface ResolvedProgramExercise {
  /** ID do bloco no template snapshot (`WorkoutTemplateExerciseBlock.id`) — vínculo estável usado para casar com `ExerciseRecord.plannedExerciseId` (Sprint 22 Parte 1), independente de troca de exerciseId/nome por substituição. */
  blockId?: string
  exerciseId?: string
  exerciseName: string
  sets?: number
  reps?: string
  loadKg?: number
  durationSeconds?: number
  distanceMeters?: number
  restSeconds?: number
  rir?: number
  rpe?: number
  tempo?: string
  notes?: string
  source: 'template' | 'weekly_override'
}

export interface ResolvedProgramSession {
  programId: string
  programVersion: number
  weekId: string
  weekNumber: number
  sessionId: string
  name: string
  exercises: ResolvedProgramExercise[]
  isOptional: boolean
  isDeload: boolean
  notes?: string
}

/**
 * Resolve o estado final de uma sessão para uma semana: snapshot do template
 * (congelado no programa) → override da semana (se existir) → estado final.
 * Nunca persiste o resultado — recalculado sob demanda.
 */
export function resolveProgramSessionForWeek(
  program: Pick<TrainingProgram, 'id' | 'version' | 'sessionOverrides'>,
  week: Pick<TrainingProgramWeek, 'id' | 'weekNumber'>,
  session: TrainingProgramSession
): ResolvedProgramSession {
  const override = findProgramSessionOverride(program.sessionOverrides, week.id, session.id)
  const overridesByBlock = new Map((override?.exerciseOverrides ?? []).map((o) => [o.exerciseBlockId, o]))

  const exercises: ResolvedProgramExercise[] = []
  for (const block of session.templateSnapshot.exerciseBlocks) {
    const ov = overridesByBlock.get(block.id)
    if (ov?.action === 'skip') continue

    const base: ResolvedProgramExercise = {
      blockId: block.id,
      exerciseId: block.exercise.exerciseId,
      exerciseName: block.exercise.exerciseName,
      sets: block.exercise.sets,
      reps: block.exercise.reps,
      loadKg: block.exercise.loadKg,
      durationSeconds: block.exercise.durationSeconds,
      distanceMeters: block.exercise.distanceMeters,
      restSeconds: block.exercise.restSeconds,
      rir: block.exercise.rir,
      rpe: block.exercise.rpe,
      tempo: block.exercise.tempo,
      notes: block.exercise.notes,
      source: 'template',
    }

    if (!ov) {
      exercises.push(base)
      continue
    }

    exercises.push({
      ...base,
      sets: ov.sets ?? base.sets,
      reps: ov.reps ?? base.reps,
      loadKg: ov.loadKg ?? base.loadKg,
      durationSeconds: ov.durationSeconds ?? base.durationSeconds,
      distanceMeters: ov.distanceMeters ?? base.distanceMeters,
      restSeconds: ov.restSeconds ?? base.restSeconds,
      rir: ov.rir ?? base.rir,
      rpe: ov.rpe ?? base.rpe,
      tempo: ov.tempo ?? base.tempo,
      notes: ov.notes ?? base.notes,
      source: 'weekly_override',
    })
  }

  return {
    programId: program.id,
    programVersion: program.version,
    weekId: week.id,
    weekNumber: week.weekNumber,
    sessionId: session.id,
    name: session.name,
    exercises,
    isOptional: session.isOptional,
    isDeload: override?.isDeload ?? false,
    notes: override?.sessionNotes ?? session.notes,
  }
}

/** Converte uma sessão resolvida de volta em snapshot — usado na instanciação do Planner. */
export function resolveProgramSessionSnapshot(
  session: TrainingProgramSession,
  resolved: ResolvedProgramSession
): WorkoutTemplateSnapshot {
  const originalBlocks = session.templateSnapshot.exerciseBlocks
  const exerciseBlocks: WorkoutTemplateExerciseBlock[] = resolved.exercises.map((ex, index) => {
    const original = originalBlocks[index]
    return {
      id: original?.id ?? `blk-resolved-${uniqueSuffix()}`,
      type: 'single',
      exercise: {
        id: original?.exercise.id ?? `ex-resolved-${uniqueSuffix()}`,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        reps: ex.reps,
        loadKg: ex.loadKg,
        durationSeconds: ex.durationSeconds,
        distanceMeters: ex.distanceMeters,
        restSeconds: ex.restSeconds,
        rir: ex.rir,
        rpe: ex.rpe,
        tempo: ex.tempo,
        notes: ex.notes,
        alternatives: original?.exercise.alternatives,
      },
    }
  })

  return {
    ...session.templateSnapshot,
    exerciseBlocks,
    capturedAt: new Date().toISOString(),
  }
}

// ─── Manual deload ──────────────────────────────────────────────────────────────

export interface ManualDeloadInput {
  weekId: string
  sessionIds: string[]
  setsMultiplier?: number
  loadMultiplier?: number
  durationMultiplier?: number
  note?: string
}

function applyMultiplier(
  value: number | undefined,
  multiplier: number | undefined,
  round: (v: number) => number
): number | undefined {
  if (value === undefined || multiplier === undefined) return undefined
  return Math.max(0, round(value * multiplier))
}

/**
 * Monta overrides de deload a partir de multiplicadores explícitos — nunca
 * aplica nada sozinho. O chamador deve mostrar a prévia (Fase 27) e só
 * persistir os overrides retornados após confirmação do usuário.
 */
export function buildManualDeloadOverrides(
  program: Pick<TrainingProgram, 'weeks'>,
  input: ManualDeloadInput
): ProgramSessionOverride[] {
  const week = program.weeks.find((w) => w.id === input.weekId)
  if (!week) return []

  const now = new Date().toISOString()
  const results: ProgramSessionOverride[] = []

  for (const sessionId of input.sessionIds) {
    const session = week.sessions.find((s) => s.id === sessionId)
    if (!session) continue

    const exerciseOverrides: ProgramExerciseOverride[] = []
    for (const block of session.templateSnapshot.exerciseBlocks) {
      const ex = block.exercise
      const sets = applyMultiplier(ex.sets, input.setsMultiplier, Math.round)
      const loadKg = applyMultiplier(ex.loadKg, input.loadMultiplier, (v) => roundWeightDown(v, 2.5))
      const durationSeconds = applyMultiplier(ex.durationSeconds, input.durationMultiplier, Math.round)

      if (sets === undefined && loadKg === undefined && durationSeconds === undefined) continue

      exerciseOverrides.push({
        exerciseBlockId: block.id,
        exerciseId: ex.exerciseId,
        ...(sets !== undefined ? { sets } : {}),
        ...(loadKg !== undefined ? { loadKg } : {}),
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
        action: 'modify',
      })
    }

    results.push({
      id: `povr-${uniqueSuffix()}`,
      weekId: input.weekId,
      sessionId,
      exerciseOverrides,
      sessionNotes: input.note,
      isDeload: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  return results
}

// ─── Comparison ───────────────────────────────────────────────────────────────

export interface ProgramExerciseComparison {
  exerciseBlockId: string
  exerciseName: string
  weekA?: ResolvedProgramExercise
  weekB?: ResolvedProgramExercise
  changed: boolean
}

export interface ProgramSessionComparison {
  sessionName: string
  weekASessionId?: string
  weekBSessionId?: string
  status: 'both' | 'added_in_b' | 'removed_in_b'
  exercises: ProgramExerciseComparison[]
}

export interface ProgramWeekComparisonSummary {
  sessionsAdded: number
  sessionsRemoved: number
  exercisesModified: number
  setsChanged: number
  loadChanged: number
  weekBIsDeload: boolean
}

export interface ProgramWeekComparison {
  weekA: number
  weekB: number
  sessionComparisons: ProgramSessionComparison[]
  summary: ProgramWeekComparisonSummary
}

function exercisesDiffer(a: ResolvedProgramExercise | undefined, b: ResolvedProgramExercise | undefined): boolean {
  if (!a || !b) return false
  return (
    a.sets !== b.sets ||
    a.reps !== b.reps ||
    a.loadKg !== b.loadKg ||
    a.durationSeconds !== b.durationSeconds ||
    a.restSeconds !== b.restSeconds ||
    a.rir !== b.rir ||
    a.rpe !== b.rpe ||
    a.tempo !== b.tempo
  )
}

/** Compara duas semanas do mesmo programa. Nunca classifica uma como "melhor". */
export function compareProgramWeeks(
  program: TrainingProgram,
  weekNumberA: number,
  weekNumberB: number
): ProgramWeekComparison | null {
  const weekA = program.weeks.find((w) => w.weekNumber === weekNumberA)
  const weekB = program.weeks.find((w) => w.weekNumber === weekNumberB)
  if (!weekA || !weekB) return null

  const sessionComparisons: ProgramSessionComparison[] = []
  const usedBIds = new Set<string>()
  let sessionsAdded = 0
  let sessionsRemoved = 0
  let exercisesModified = 0
  let setsChanged = 0
  let loadChanged = 0
  let weekBIsDeload = false

  for (const sessionA of weekA.sessions) {
    const sessionB = weekB.sessions.find((s) => s.name === sessionA.name && !usedBIds.has(s.id))
    const resolvedA = resolveProgramSessionForWeek(program, weekA, sessionA)
    const resolvedB = sessionB ? resolveProgramSessionForWeek(program, weekB, sessionB) : undefined
    if (sessionB) usedBIds.add(sessionB.id)
    if (resolvedB?.isDeload) weekBIsDeload = true
    if (!sessionB) sessionsRemoved++

    const exercises: ProgramExerciseComparison[] = []
    const maxLen = Math.max(resolvedA.exercises.length, resolvedB?.exercises.length ?? 0)
    for (let i = 0; i < maxLen; i++) {
      const exA = resolvedA.exercises[i]
      const exB = resolvedB?.exercises[i]
      const blockIdA = sessionA.templateSnapshot.exerciseBlocks[i]?.id
      const changed = exercisesDiffer(exA, exB)
      if (changed) {
        exercisesModified++
        if (exA?.sets !== exB?.sets) setsChanged++
        if (exA?.loadKg !== exB?.loadKg) loadChanged++
      }
      exercises.push({
        exerciseBlockId: blockIdA ?? `idx-${i}`,
        exerciseName: exA?.exerciseName ?? exB?.exerciseName ?? '',
        weekA: exA,
        weekB: exB,
        changed,
      })
    }

    sessionComparisons.push({
      sessionName: sessionA.name,
      weekASessionId: sessionA.id,
      weekBSessionId: sessionB?.id,
      status: sessionB ? 'both' : 'removed_in_b',
      exercises,
    })
  }

  for (const sessionB of weekB.sessions) {
    if (usedBIds.has(sessionB.id)) continue
    sessionsAdded++
    const resolvedB = resolveProgramSessionForWeek(program, weekB, sessionB)
    if (resolvedB.isDeload) weekBIsDeload = true
    sessionComparisons.push({
      sessionName: sessionB.name,
      weekBSessionId: sessionB.id,
      status: 'added_in_b',
      exercises: resolvedB.exercises.map((ex, i) => ({
        exerciseBlockId: sessionB.templateSnapshot.exerciseBlocks[i]?.id ?? `idx-${i}`,
        exerciseName: ex.exerciseName,
        weekB: ex,
        changed: true,
      })),
    })
  }

  return {
    weekA: weekNumberA,
    weekB: weekNumberB,
    sessionComparisons,
    summary: { sessionsAdded, sessionsRemoved, exercisesModified, setsChanged, loadChanged, weekBIsDeload },
  }
}

// ─── Planned volume ─────────────────────────────────────────────────────────────

export interface PlannedVolumeResult {
  totalVolumeKg: number
  calculableExerciseCount: number
  unknownExerciseCount: number
}

/** Só soma exercícios com séries, repetições numéricas e carga — nunca trata "8–10" como número único. */
export function calculatePlannedVolume(exercises: ResolvedProgramExercise[]): PlannedVolumeResult {
  let totalVolumeKg = 0
  let calculableExerciseCount = 0
  let unknownExerciseCount = 0

  for (const ex of exercises) {
    const repsIsNumeric = ex.reps !== undefined && /^\d+$/.test(ex.reps.trim())
    if (ex.sets !== undefined && ex.loadKg !== undefined && repsIsNumeric) {
      totalVolumeKg += ex.sets * Number(ex.reps) * ex.loadKg
      calculableExerciseCount++
    } else if (ex.sets !== undefined || ex.loadKg !== undefined || ex.reps !== undefined) {
      unknownExerciseCount++
    }
  }

  return { totalVolumeKg, calculableExerciseCount, unknownExerciseCount }
}

// ─── Integrity ────────────────────────────────────────────────────────────────

export interface ProgramProgressionIntegrityReport {
  orphanOverrides: string[]
  invalidBlockRanges: string[]
  overlappingBlocks: string[]
  uncoveredWeeks: number[]
  emptyDeloadBlocks: string[]
}

/** Nunca repara nada sozinho — apenas relata para que a UI ofereça reparo explícito. */
export function validateProgramProgressionIntegrity(program: TrainingProgram): ProgramProgressionIntegrityReport {
  const orphanOverrides: string[] = []
  const weekById = new Map(program.weeks.map((w) => [w.id, w]))

  for (const override of program.sessionOverrides ?? []) {
    const week = weekById.get(override.weekId)
    const session = week?.sessions.find((s) => s.id === override.sessionId)
    if (!week || !session) {
      orphanOverrides.push(override.id)
      continue
    }
    const blockIds = new Set(session.templateSnapshot.exerciseBlocks.map((b) => b.id))
    const hasOrphanExercise = override.exerciseOverrides.some((eo) => !blockIds.has(eo.exerciseBlockId))
    if (hasOrphanExercise) orphanOverrides.push(override.id)
  }

  const blocks = program.blocks ?? []
  const blockValidation = validateTrainingBlocks(blocks, program.weeks.length)
  const invalidBlockRanges = Array.from(
    new Set(blockValidation.errors.filter((e) => e.type === 'invalid_range').map((e) => e.blockId))
  )
  const overlappingBlocks = Array.from(
    new Set(blockValidation.errors.filter((e) => e.type === 'overlap').map((e) => e.blockId))
  )

  const coveredWeeks = new Set<number>()
  for (const block of blocks) {
    for (let n = block.startWeek; n <= block.endWeek; n++) coveredWeeks.add(n)
  }
  const uncoveredWeeks =
    blocks.length > 0 ? program.weeks.map((w) => w.weekNumber).filter((n) => !coveredWeeks.has(n)) : []

  const emptyDeloadBlocks: string[] = []
  for (const block of blocks) {
    if (block.objective !== 'deload') continue
    const weekIdsInBlock = new Set(
      program.weeks.filter((w) => w.weekNumber >= block.startWeek && w.weekNumber <= block.endWeek).map((w) => w.id)
    )
    const hasOverride = (program.sessionOverrides ?? []).some((o) => weekIdsInBlock.has(o.weekId))
    if (!hasOverride) emptyDeloadBlocks.push(block.id)
  }

  return { orphanOverrides, invalidBlockRanges, overlappingBlocks, uncoveredWeeks, emptyDeloadBlocks }
}
