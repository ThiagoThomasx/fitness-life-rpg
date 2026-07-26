// Diff engine (Sprint 27 Parte 1).
//
// Motor puro: recebe snapshots antes/depois e devolve uma lista de mudanças
// legíveis. Nunca lê storage, nunca decide nada — só compara. Primeira
// implementação de diff genérico neste repositório (ver auditoria).

import type {
  AdaptivePlanChange,
  AdaptivePlanSnapshot,
  VolumeChangeSnapshot,
  ScheduleChangeSnapshot,
  FrequencyChangeSnapshot,
  ExerciseChangeSnapshot,
} from './types'

function diffVolume(before: VolumeChangeSnapshot, after: VolumeChangeSnapshot): AdaptivePlanChange[] {
  const changes: AdaptivePlanChange[] = []

  const beforeById = new Map(before.exercises.map((ex) => [ex.exerciseId ?? ex.name, ex]))
  const afterById = new Map(after.exercises.map((ex) => [ex.exerciseId ?? ex.name, ex]))

  for (const [key, beforeEx] of Array.from(beforeById)) {
    const afterEx = afterById.get(key)
    if (!afterEx) {
      changes.push({
        kind: 'exercise_removed',
        target: beforeEx.name,
        before: beforeEx.sets,
        after: 0,
        rationale: 'Exercício removido do treino proposto.',
        impact: `-${beforeEx.sets} séries`,
      })
      continue
    }
    if (afterEx.sets !== beforeEx.sets) {
      const delta = afterEx.sets - beforeEx.sets
      changes.push({
        kind: 'set_count',
        target: beforeEx.name,
        before: beforeEx.sets,
        after: afterEx.sets,
        rationale: delta < 0 ? 'Redução de volume sugerida pelo Coach.' : 'Aumento conservador de volume.',
        impact: `${delta > 0 ? '+' : ''}${delta} séries`,
      })
    }
  }

  for (const [key, afterEx] of Array.from(afterById)) {
    if (!beforeById.has(key)) {
      changes.push({
        kind: 'exercise_added',
        target: afterEx.name,
        before: 0,
        after: afterEx.sets,
        rationale: 'Exercício adicionado ao treino proposto.',
        impact: `+${afterEx.sets} séries`,
      })
    }
  }

  if (after.totalSets !== before.totalSets) {
    changes.push({
      kind: 'volume_changed',
      target: after.workoutName,
      before: before.totalSets,
      after: after.totalSets,
      rationale: 'Volume total do treino.',
      impact: `${after.totalSets - before.totalSets > 0 ? '+' : ''}${after.totalSets - before.totalSets} séries no total`,
    })
  }

  return changes
}

function diffSchedule(before: ScheduleChangeSnapshot, after: ScheduleChangeSnapshot): AdaptivePlanChange[] {
  if (before.date === after.date) return []
  return [
    {
      kind: 'date_changed',
      target: after.workoutName,
      before: before.date,
      after: after.date,
      rationale: 'Reagendamento sugerido pelo Coach.',
      impact: `${before.date} → ${after.date}`,
    },
  ]
}

function diffFrequency(before: FrequencyChangeSnapshot, after: FrequencyChangeSnapshot): AdaptivePlanChange[] {
  if (before.sessionsPerWeek === after.sessionsPerWeek) return []
  return [
    {
      kind: 'frequency_changed',
      target: 'Sessões por semana',
      before: before.sessionsPerWeek,
      after: after.sessionsPerWeek,
      rationale: 'Ajuste de frequência baseado em aderência histórica.',
      impact: `${after.sessionsPerWeek - before.sessionsPerWeek > 0 ? '+' : ''}${after.sessionsPerWeek - before.sessionsPerWeek} sessões/semana`,
    },
  ]
}

function diffExercise(before: ExerciseChangeSnapshot, after: ExerciseChangeSnapshot): AdaptivePlanChange[] {
  if (before.exerciseName === after.exerciseName) return []
  return [
    {
      kind: 'exercise_replaced',
      target: before.exerciseName,
      before: before.exerciseName,
      after: after.exerciseName,
      rationale: 'Substituição recorrente detectada pelo Coach.',
      impact: `${before.exerciseName} → ${after.exerciseName}`,
    },
  ]
}

/**
 * Compara before/after do mesmo `kind` e devolve as mudanças. `before.kind`
 * e `after.kind` devem ser iguais — snapshots de tipos diferentes não têm
 * diff (retorna lista vazia em vez de lançar, para manter o motor puro e
 * previsível mesmo diante de dados inesperados).
 */
export function buildProposalDiff(before: AdaptivePlanSnapshot, after: AdaptivePlanSnapshot): AdaptivePlanChange[] {
  if (before.kind !== after.kind) return []

  switch (before.kind) {
    case 'volume':
      return diffVolume(before, after as VolumeChangeSnapshot)
    case 'schedule':
      return diffSchedule(before, after as ScheduleChangeSnapshot)
    case 'frequency':
      return diffFrequency(before, after as FrequencyChangeSnapshot)
    case 'exercise':
      return diffExercise(before, after as ExerciseChangeSnapshot)
    case 'none':
      return []
    default:
      return []
  }
}

/** Linhas de texto prontas para UI/exportação — não depende de cor para comunicar a mudança. */
export function formatChangesAsText(changes: AdaptivePlanChange[]): string[] {
  return changes.map((change) => `${change.target}: ${change.before} → ${change.after} (${change.impact})`)
}
