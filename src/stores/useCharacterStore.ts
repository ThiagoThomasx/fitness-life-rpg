import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
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
  applyAttributeGains: (gains: Partial<Pick<Character, 'strength' | 'agility' | 'dexterity' | 'constitution' | 'vitality'>>) => void
  applyDiaryXp: (xp: number) => void
}

export interface XpGainResult {
  xp_earned: number
  base_xp: number
  intensity_multiplier: number
  consistency_multiplier: number
  bonus: number
  prsCount: number
  breakdown: Array<{ label: string; amount: number }>
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

const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(name)
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(name, value) } catch {}
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(name)
  },
}

export const useCharacterStore = create<CharacterState & CharacterActions>()(
  devtools(
    persist(
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

        applyAttributeGains: (gains) =>
          set(
            (state) => {
              if (!state.character) return state
              return { character: { ...state.character, ...gains } }
            },
            false,
            'character/applyAttributeGains'
          ),

        applyDiaryXp: (xp) =>
          set(
            (state) => {
              if (!state.character) return state
              let newCurrentXp = state.character.current_xp + xp
              let newLevel = state.character.level
              while (newCurrentXp >= xpToNextLevel(newLevel)) {
                newCurrentXp -= xpToNextLevel(newLevel)
                newLevel++
              }
              return {
                character: {
                  ...state.character,
                  current_xp: newCurrentXp,
                  total_xp: state.character.total_xp + xp,
                  level: newLevel,
                },
              }
            },
            false,
            'character/applyDiaryXp'
          ),
      }),
      {
        name: 'lrpg-fit:character',
        storage: createJSONStorage(() => safeStorage),
        partialize: (state) => ({ character: state.character }),
        // Hidratação manual (ver StoreHydrationBoundary): sem isso, o
        // localStorage é lido de forma síncrona no import do módulo, então o
        // primeiro render do cliente já reflete os dados reais enquanto o
        // SSR usa o estado inicial (null) — divergência que causa hydration
        // mismatch em qualquer tela que leia `character`.
        skipHydration: true,
      }
    ),
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
