// Personal Record Events — Sprint 22 Parte 3B.
//
// Conecta a detecção de recordes já existente (`detectNewExerciseRecords` em
// `exercise-intelligence.ts`) a um evento persistido e vinculável a uma sessão
// concluída. Antes desta sprint, o único registro de PR era o `RewardEvent`
// textual (`type: 'pr'`) — sem `exerciseId`/`workoutId`/valores estruturados
// e sem possibilidade de listar/filtrar recordes de uma sessão específica.
//
// Detecção só deve ocorrer em `finishWorkout()` (sessao/page.tsx), nunca ao
// abrir páginas, recalcular histórico ou restaurar backup — por isso este
// módulo só EXPÕE a função de detecção pura (`detectSessionRecordEvents`) e a
// função de persistência idempotente (`addPersonalRecordEvents`); nada aqui
// é chamado automaticamente por outro motor.

import { detectNewExerciseRecords, type ExerciseRecordType } from './exercise-intelligence'

const STORAGE_KEY = 'lrpg-fit:personal-record-events'

// ─── Modelo ───────────────────────────────────────────────────────────────────

export interface PersonalRecordEvent {
  id: string
  workoutId: string
  exerciseId: string
  exerciseName: string
  recordType: ExerciseRecordType
  previousValue?: number
  newValue: number
  unit: 'kg' | 'reps' | 'sets'
  achievedAt: string
}

const RECORD_UNITS: Record<ExerciseRecordType, PersonalRecordEvent['unit']> = {
  max_load: 'kg',
  max_reps: 'reps',
  best_set_volume: 'kg',
  max_session_volume: 'kg',
  max_sets_in_session: 'sets',
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function safeGet(): PersonalRecordEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersonalRecordEvent[]) : []
  } catch {
    return []
  }
}

function safeSet(events: PersonalRecordEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // Storage unavailable — silently skip
  }
}

export function getPersonalRecordEvents(): PersonalRecordEvent[] {
  return safeGet()
}

export function getPersonalRecordEventsForWorkout(workoutId: string): PersonalRecordEvent[] {
  return safeGet().filter((e) => e.workoutId === workoutId)
}

export function getPersonalRecordEventsForExercise(exerciseId: string): PersonalRecordEvent[] {
  return safeGet().filter((e) => e.exerciseId === exerciseId)
}

/**
 * Persiste eventos de recorde para uma sessão. Idempotente por `workoutId`:
 * se já existem eventos para esta sessão (segundo clique em "confirmar",
 * reload da página de resumo, restore de backup que reimporta o mesmo
 * histórico), a chamada é ignorada — nunca duplica.
 */
export function addPersonalRecordEvents(
  workoutId: string,
  events: Array<Omit<PersonalRecordEvent, 'id' | 'workoutId'>>
): PersonalRecordEvent[] {
  if (events.length === 0) return []
  const existing = safeGet()
  if (existing.some((e) => e.workoutId === workoutId)) return []

  const saved: PersonalRecordEvent[] = events.map((event, index) => ({
    ...event,
    id: `pre-${workoutId}-${index}`,
    workoutId,
  }))
  safeSet([...saved, ...existing])
  return saved
}

// ─── Detecção por sessão ────────────────────────────────────────────────────────

export interface SessionExerciseInput {
  exerciseId: string
  exerciseName: string
  sets: Array<{ weight_kg: number; reps: number }>
}

/**
 * Detecta os recordes batidos por uma sessão ainda não salva, exercício por
 * exercício, reaproveitando `detectNewExerciseRecords` (motor da Parte 1).
 * Deve ser chamado ANTES de `saveCompletedWorkout`, do contrário a sessão se
 * compara consigo mesma e nenhum recorde é detectado (mesma regra de
 * `detectExercisePrs`/`detectNewExerciseRecords`).
 */
export function detectSessionRecordEvents(
  exercises: SessionExerciseInput[]
): Array<Omit<PersonalRecordEvent, 'id' | 'workoutId'>> {
  const events: Array<Omit<PersonalRecordEvent, 'id' | 'workoutId'>> = []
  const achievedAt = new Date().toISOString()

  for (const exercise of exercises) {
    if (exercise.sets.length === 0) continue
    const changes = detectNewExerciseRecords(exercise.exerciseId, exercise.sets)
    for (const change of changes) {
      events.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        recordType: change.type,
        previousValue: change.previousValue,
        newValue: change.newValue,
        unit: RECORD_UNITS[change.type],
        achievedAt,
      })
    }
  }

  return events
}
