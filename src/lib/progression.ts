import { getExerciseHistory, getExercisePersonalBest } from './workout-history'

export interface ProgressionSuggestion {
  suggestedWeightKg: number | null
  suggestedReps: number
  note: string
}

export function suggestProgression(
  exerciseId: string,
  targetWeightKg: number | null = null
): ProgressionSuggestion {
  const history = getExerciseHistory(exerciseId)
  const pb = getExercisePersonalBest(exerciseId)

  if (history.length === 0) {
    return {
      suggestedWeightKg: targetWeightKg,
      suggestedReps: 10,
      note: targetWeightKg ? `Comece com ${targetWeightKg}kg × 10 reps.` : 'Primeiro registro — defina sua carga inicial.',
    }
  }

  const lastRecord = history[0]
  const lastSets = lastRecord.sets

  if (lastSets.length === 0) {
    return {
      suggestedWeightKg: pb || targetWeightKg,
      suggestedReps: 10,
      note: 'Continue com a carga anterior.',
    }
  }

  const lastWeight = Math.max(...lastSets.map((s) => s.weight_kg))
  const lastReps = lastSets[lastSets.length - 1]?.reps ?? 0
  const allSetsHitTarget = lastSets.every((s) => s.reps >= 10)

  if (lastWeight > 0 && allSetsHitTarget) {
    const increase = lastWeight < 20 ? 1 : 2.5
    return {
      suggestedWeightKg: lastWeight + increase,
      suggestedReps: 10,
      note: `Ótimo! Tente +${increase}kg (${lastWeight}kg → ${lastWeight + increase}kg).`,
    }
  }

  if (lastWeight > 0) {
    const nextReps = Math.min(lastReps + 1, 12)
    return {
      suggestedWeightKg: lastWeight,
      suggestedReps: nextReps,
      note: `Mantenha ${lastWeight}kg e tente ${nextReps} reps.`,
    }
  }

  // Bodyweight
  const nextReps = Math.min((lastReps || 8) + 2, 25)
  return {
    suggestedWeightKg: null,
    suggestedReps: nextReps,
    note: `Tente ${nextReps} reps hoje.`,
  }
}
