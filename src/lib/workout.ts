import type { WorkoutType, Character } from '@/types/database'
import type { XpGainResult } from '@/stores/useCharacterStore'

function xpToNextLevel(level: number): number {
  return 100 * level * level
}

export function calculateXpGain(
  workoutType: WorkoutType,
  totalSets: number,
  elapsedSeconds: number,
  character: Character
): XpGainResult {
  const base_xp = workoutType.base_xp
  const durationMin = elapsedSeconds / 60
  const intensity_multiplier =
    durationMin >= 20 ? 1.2 : durationMin >= 10 ? 1.1 : 1.0
  const consistency_multiplier = 1.0
  const bonus = 0

  const xp_earned = Math.round(
    (base_xp + totalSets * 5) * intensity_multiplier
  )

  const old_level = character.level
  let new_level = old_level
  let new_current_xp = character.current_xp + xp_earned
  const new_total_xp = character.total_xp + xp_earned

  while (new_current_xp >= xpToNextLevel(new_level)) {
    new_current_xp -= xpToNextLevel(new_level)
    new_level++
  }

  return {
    xp_earned,
    base_xp,
    intensity_multiplier,
    consistency_multiplier,
    bonus,
    level_up: new_level > old_level,
    old_level,
    new_level,
    new_current_xp,
    new_total_xp,
  }
}
