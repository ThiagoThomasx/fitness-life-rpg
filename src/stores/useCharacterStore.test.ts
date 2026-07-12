import { describe, it, expect, beforeEach } from 'vitest'
import { useCharacterStore, type XpGainResult } from './useCharacterStore'

const INITIAL_STATE = { character: null, recentTransactions: [], isLoading: false, error: null }

function resetStore() {
  // A ordem importa: `setState` aciona o subscriber do `persist` do Zustand,
  // que grava no localStorage mesmo com `skipHydration: true` (só a LEITURA
  // automática é pulada). Limpar depois do setState garante um storage
  // realmente vazio no início de cada teste, como numa instalação nova.
  useCharacterStore.setState(INITIAL_STATE)
  window.localStorage.clear()
}

beforeEach(() => {
  resetStore()
})

describe('initializeCharacter (Hotfix 10.1)', () => {
  it('a fresh install starts with no persisted or in-memory character', () => {
    expect(window.localStorage.getItem('lrpg-fit:character')).toBeNull()
    expect(useCharacterStore.getState().character).toBeNull()
  })

  it('seeds a default character when none exists yet', () => {
    useCharacterStore.getState().initializeCharacter()
    const character = useCharacterStore.getState().character
    expect(character).not.toBeNull()
    expect(character?.level).toBe(1)
    expect(character?.current_xp).toBe(0)
    expect(character?.total_xp).toBe(0)
  })

  it('does not overwrite an existing, already-progressed character', () => {
    const existing = {
      id: 'real-char', user_id: 'u1', name: 'Guerreiro', level: 7,
      current_xp: 120, total_xp: 5000, strength: 12, agility: 9, dexterity: 8,
      constitution: 10, vitality: 11,
      created_at: '2020-01-01T00:00:00.000Z', updated_at: '2020-01-01T00:00:00.000Z',
    }
    useCharacterStore.setState({ character: existing })

    useCharacterStore.getState().initializeCharacter()

    expect(useCharacterStore.getState().character).toEqual(existing)
  })

  it('recovers a legacy character: null state the same way as a fresh install', () => {
    // Simula um backup antigo ou storage corrompido: chave existe, mas o
    // valor de `character` dentro do envelope já é `null`.
    useCharacterStore.setState({ character: null })

    useCharacterStore.getState().initializeCharacter()

    const character = useCharacterStore.getState().character
    expect(character).not.toBeNull()
    expect(character?.level).toBe(1)
    expect(character?.current_xp).toBe(0)
  })

  it('is idempotent: repeated calls do not re-create or reset progress already made', () => {
    useCharacterStore.getState().initializeCharacter()
    const firstCreatedAt = useCharacterStore.getState().character?.created_at

    useCharacterStore.getState().applyDiaryXp(50)
    useCharacterStore.getState().initializeCharacter()
    useCharacterStore.getState().initializeCharacter()

    const character = useCharacterStore.getState().character
    expect(character?.created_at).toBe(firstCreatedAt)
    expect(character?.current_xp).toBe(50)
  })

  it('a refresh (StoreHydrationBoundary re-running initializeCharacter) does not reset progress', () => {
    useCharacterStore.getState().initializeCharacter()
    useCharacterStore.getState().applyDiaryXp(30)

    // Simula o boundary rodando de novo num refresh de página.
    useCharacterStore.getState().initializeCharacter()

    expect(useCharacterStore.getState().character?.current_xp).toBe(30)
  })
})

describe('XP-granting actions require an initialized character', () => {
  it('applyDiaryXp grants XP for a new user once initialized (missão/diário/nutrição)', () => {
    useCharacterStore.getState().initializeCharacter()

    useCharacterStore.getState().applyDiaryXp(15)

    expect(useCharacterStore.getState().character?.current_xp).toBe(15)
    expect(useCharacterStore.getState().character?.total_xp).toBe(15)
  })

  it('applyDiaryXp is a no-op without initialization (documents the bug this hotfix closes)', () => {
    useCharacterStore.getState().applyDiaryXp(15)

    expect(useCharacterStore.getState().character).toBeNull()
  })

  it('applyXpGain grants workout XP for a new user (smallest testable unit of the session-completion flow)', () => {
    useCharacterStore.getState().initializeCharacter()
    const result: XpGainResult = {
      xp_earned: 80, base_xp: 60, intensity_multiplier: 1.2, consistency_multiplier: 1,
      bonus: 0, prsCount: 0, breakdown: [], level_up: false, old_level: 1, new_level: 1,
      new_current_xp: 80, new_total_xp: 80,
    }

    useCharacterStore.getState().applyXpGain(result)

    const character = useCharacterStore.getState().character
    expect(character?.current_xp).toBe(80)
    expect(character?.total_xp).toBe(80)
  })

  it('applyAttributeGains updates attributes for a new user', () => {
    useCharacterStore.getState().initializeCharacter()

    useCharacterStore.getState().applyAttributeGains({ strength: 6, vitality: 7 })

    const character = useCharacterStore.getState().character
    expect(character?.strength).toBe(6)
    expect(character?.vitality).toBe(7)
  })
})
