// Motor puro de redistribuição de volume (Sprint 27 Parte 2).
//
// Só matemática determinística — nenhuma leitura de storage, nenhuma decisão
// sobre QUAL sessão alterar (isso é `volume-proposals.ts`). Regras da sprint
// (Fases 12/13): nunca abaixo do mínimo por exercício, distribuição
// equilibrada (rodízio, não concentra tudo no mesmo exercício), aumento
// sempre mais conservador que a redução.

import { MIN_SETS_PER_EXERCISE } from './helpers'
import type { VolumeChangeExerciseSnapshot } from './types'

/**
 * Reduz o total de séries até `targetTotalSets`, tirando 1 série por vez de
 * cada exercício em rodízio (nunca abaixo de `MIN_SETS_PER_EXERCISE`). Isso
 * espalha a redução em vez de esvaziar um único exercício — o exemplo da
 * sprint (16 → 13 séries tirando 1 de três exercícios, preservando o quarto)
 * é exatamente o resultado de uma passada de rodízio.
 */
export function reduceVolumeEvenly(
  exercises: VolumeChangeExerciseSnapshot[],
  targetTotalSets: number
): VolumeChangeExerciseSnapshot[] {
  const result = exercises.map((ex) => ({ ...ex }))
  const currentTotal = result.reduce((sum, ex) => sum + ex.sets, 0)
  let remaining = currentTotal - targetTotalSets
  if (remaining <= 0) return result

  let madeProgress = true
  while (remaining > 0 && madeProgress) {
    madeProgress = false
    for (const ex of result) {
      if (remaining <= 0) break
      if (ex.sets > MIN_SETS_PER_EXERCISE) {
        ex.sets -= 1
        remaining -= 1
        madeProgress = true
      }
    }
  }
  return result
}

/** Calcula o alvo de séries totais para uma redução percentual, arredondado para baixo, nunca abaixo do total mínimo possível. */
export function computeReducedTarget(exercises: VolumeChangeExerciseSnapshot[], reductionPercent: number): number {
  const currentTotal = exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const minPossible = exercises.length * MIN_SETS_PER_EXERCISE
  const target = Math.round(currentTotal * (1 - reductionPercent / 100))
  return Math.max(target, minPossible)
}

/**
 * Aumenta o volume de forma conservadora: +1 série por vez, em rodízio,
 * limitado a `maxExercisesTouched` exercícios distintos (Fase 13 — "+1 série
 * em dois exercícios" em vez de saltos grandes). Nunca aumenta mais do que
 * `maxIncreasePerExercise` séries no mesmo exercício nesta proposta.
 */
export function increaseVolumeConservatively(
  exercises: VolumeChangeExerciseSnapshot[],
  targetIncreaseSets: number,
  maxExercisesTouched = 2,
  maxIncreasePerExercise = 1
): VolumeChangeExerciseSnapshot[] {
  const result = exercises.map((ex) => ({ ...ex }))
  const touched = new Map<string, number>()
  let remaining = targetIncreaseSets

  let madeProgress = true
  while (remaining > 0 && madeProgress) {
    madeProgress = false
    for (const ex of result) {
      if (remaining <= 0) break
      const key = ex.exerciseId ?? ex.name
      const touchedCount = touched.get(key) ?? 0
      const canTouchNewExercise = touched.size < maxExercisesTouched || touched.has(key)
      if (canTouchNewExercise && touchedCount < maxIncreasePerExercise) {
        ex.sets += 1
        touched.set(key, touchedCount + 1)
        remaining -= 1
        madeProgress = true
      }
    }
  }
  return result
}
