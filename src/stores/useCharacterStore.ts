import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Character, XpTransaction } from '@/types/database'

interface CharacterState {
  character: Character | null
  recentTransactions: XpTransaction[]
  isLoading: boolean
  error: string | null
}

interface CharacterActions {
  setCharacter: (character: Character) => void
  clearCharacter: () => void
  addTransaction: (tx: XpTransaction) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  applyXpGain: (result: XpGainResult) => void
}

export interface XpGainResult {
  xp_earned: number
  base_xp: number
  intensity_multiplier: number
  consistency_multiplier: number
  bonus: number
  level_up: boolean
  old_level: number
  new_level: number
  new_current_xp: number
  new_total_xp: number
}

const INITIAL_STATE: CharacterState = {
  character: null,
  recentTransactions: [],
  isLoading: false,
  error: null,
}

export const useCharacterStore = create<CharacterState & CharacterActions>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,

      setCharacter: (character) =>
        set({ character, error: null }, false, 'character/set'),

      clearCharacter: () =>
        set(INITIAL_STATE, false, 'character/clear'),

      addTransaction: (tx) =>
        set(
          (state) => ({
            recentTransactions: [tx, ...state.recentTransactions].slice(0, 20),
          }),
          false,
          'character/addTransaction'
        ),

      setLoading: (isLoading) =>
        set({ isLoading }, false, 'character/setLoading'),

      setError: (error) =>
        set({ error }, false, 'character/setError'),

      applyXpGain: (result) =>
        set(
          (state) => {
            if (!state.character) return state
            return {
              character: {
                ...state.character,
                level: result.new_level,
                current_xp: result.new_current_xp,
                total_xp: result.new_total_xp,
              },
            }
          },
          false,
          'character/applyXpGain'
        ),
    }),
    { name: 'CharacterStore' }
  )
)

export function xpToNextLevel(level: number): number {
  return 100 * level * level
}

export function xpProgress(character: Character): number {
  const needed = xpToNextLevel(character.level)
  return Math.min(character.current_xp / needed, 1)
}
