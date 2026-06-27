import type { WorkoutType, Character } from '@/types/database'
import type { XpGainResult } from '@/stores/useCharacterStore'

const XP_PER_PR = 50
const XP_SESSION_CAP = 300

function xpToNextLevel(level: number): number {
  return 100 * level * level
}

export function calculateXpGain(
  workoutType: WorkoutType,
  totalSets: number,
  elapsedSeconds: number,
  character: Character,
  prsCount = 0
): XpGainResult {
  const base_xp = workoutType.base_xp
  const durationMin = elapsedSeconds / 60
  const intensity_multiplier =
    durationMin >= 20 ? 1.2 : durationMin >= 10 ? 1.1 : 1.0
  const consistency_multiplier = 1.0

  const setsXp = totalSets * 5
  const prBonus = Math.min(prsCount * XP_PER_PR, 150)
  const rawXp = Math.round((base_xp + setsXp) * intensity_multiplier) + prBonus
  const xp_earned = Math.min(rawXp, XP_SESSION_CAP)

  const breakdown: XpGainResult['breakdown'] = [
    { label: 'XP base', amount: base_xp },
    { label: `${totalSets} séries`, amount: setsXp },
  ]
  if (intensity_multiplier > 1.0) {
    breakdown.push({ label: `×${intensity_multiplier.toFixed(1)} intensidade`, amount: Math.round((base_xp + setsXp) * (intensity_multiplier - 1)) })
  }
  if (prBonus > 0) {
    breakdown.push({ label: `${prsCount} PR${prsCount > 1 ? 's' : ''}`, amount: prBonus })
  }

  const bonus = prBonus
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
    prsCount,
    breakdown,
    level_up: new_level > old_level,
    old_level,
    new_level,
    new_current_xp,
    new_total_xp,
  }
}
