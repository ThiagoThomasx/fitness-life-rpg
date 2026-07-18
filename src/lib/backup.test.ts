import { describe, it, expect, beforeEach } from 'vitest'
import {
  exportBackup,
  importBackup,
  parseBackupFile,
  resetAllData,
  validateBackupPayload,
  STORAGE_KEYS,
  BACKUP_VERSION,
  type BackupPayload,
} from './backup'

function seedSampleData() {
  window.localStorage.setItem(
    'lrpg-fit:character',
    JSON.stringify({ state: { character: { level: 3, current_xp: 40, total_xp: 340 } }, version: 0 })
  )
  window.localStorage.setItem('lrpg-fit:workout-history', JSON.stringify([{ id: 'w1', name: 'Peito' }]))
  window.localStorage.setItem('lrpg-fit:badges', JSON.stringify([{ id: 'b1' }]))
  window.localStorage.setItem('lrpg-fit:char-name', JSON.stringify('Thiago'))
  window.localStorage.setItem(
    'lrpg-fit:training-cycles',
    JSON.stringify([
      {
        id: 'cycle-1', name: 'Bloco de força', goal: 'strength', startDate: '2026-08-01',
        status: 'active', createdAt: '2026-08-01T12:00:00.000Z', updatedAt: '2026-08-01T12:00:00.000Z',
      },
    ])
  )
  window.localStorage.setItem(
    'lrpg-fit:cycle-reviews',
    JSON.stringify([
      {
        id: 'review-1', cycleId: 'cycle-1', phase: 'mid_cycle', createdAt: '2026-08-15T12:00:00.000Z',
        perceivedProgress: 4, perceivedRecovery: 3, satisfaction: 5,
      },
    ])
  )
  window.localStorage.setItem(
    'lrpg-fit:cycle-week-annotations',
    JSON.stringify([
      {
        id: 'week-annotation-1', cycleId: 'cycle-1', weekStartDate: '2026-08-10', type: 'recovery',
        createdAt: '2026-08-10T12:00:00.000Z', updatedAt: '2026-08-10T12:00:00.000Z',
      },
    ])
  )
  window.localStorage.setItem(
    'lrpg-fit:training-goals',
    JSON.stringify([
      {
        id: 'goal-1', title: 'Supino 60kg', type: 'exercise_weight', status: 'active',
        exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
        startDate: '2026-08-01', createdAt: '2026-08-01T12:00:00.000Z', updatedAt: '2026-08-01T12:00:00.000Z',
      },
    ])
  )
  window.localStorage.setItem(
    'lrpg-fit:goal-milestones',
    JSON.stringify([
      { id: 'milestone-goal-1-25', goalId: 'goal-1', percentage: 25, reachedAt: '2026-08-10T12:00:00.000Z' },
    ])
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('exportBackup / importBackup round trip', () => {
  it('restores every seeded key without duplication after export -> reset -> import', () => {
    seedSampleData()
    const before: Record<string, string | null> = {}
    for (const key of STORAGE_KEYS) before[key] = window.localStorage.getItem(key)

    const payload = exportBackup()
    resetAllData()
    for (const key of STORAGE_KEYS) expect(window.localStorage.getItem(key)).toBeNull()

    const result = importBackup(payload)

    expect(result.ok).toBe(true)
    for (const key of STORAGE_KEYS) expect(window.localStorage.getItem(key)).toEqual(before[key])
  })

  it('reports restored keys and skipped (absent) keys correctly', () => {
    seedSampleData()
    const payload = exportBackup()
    resetAllData()
    const result = importBackup(payload)

    expect(result.restoredKeys).toContain('lrpg-fit:character')
    expect(result.restoredKeys).toContain('lrpg-fit:workout-history')
    expect(result.skippedKeys).toContain('lrpg-fit:preferences')
  })
})

describe('parseBackupFile', () => {
  it('rejects malformed JSON', () => {
    expect(parseBackupFile('{"version": 1, "data":')).toBeNull()
  })

  it('rejects an empty file', () => {
    expect(parseBackupFile('')).toBeNull()
  })

  it('rejects a file that is not JSON at all', () => {
    expect(parseBackupFile('isso não é um backup')).toBeNull()
  })

  it('rejects a payload missing required envelope fields', () => {
    expect(validateBackupPayload({ data: {} })).toBe(false)
    expect(validateBackupPayload({ version: 1, data: {} })).toBe(false) // missing exportedAt
    expect(validateBackupPayload(null)).toBe(false)
    expect(validateBackupPayload('not an object')).toBe(false)
  })

  it('accepts a well-formed payload', () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), data: {} }
    expect(parseBackupFile(JSON.stringify(payload))).toEqual(payload)
  })
})

describe('importBackup version handling', () => {
  it('rejects a backup from a future/unsupported version and preserves current data', () => {
    seedSampleData()
    const before = window.localStorage.getItem('lrpg-fit:workout-history')

    const future: BackupPayload = { version: BACKUP_VERSION + 998, exportedAt: new Date().toISOString(), data: {} }
    const result = importBackup(future)

    expect(result.ok).toBe(false)
    expect(window.localStorage.getItem('lrpg-fit:workout-history')).toEqual(before)
  })
})

describe('importBackup schema validation (atomicity)', () => {
  it('rejects a backup where an array-shaped key was replaced by a string, and touches nothing', () => {
    seedSampleData()
    const before = window.localStorage.getItem('lrpg-fit:badges')

    const corrupt: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { 'lrpg-fit:badges': 'oops-not-an-array' },
    }
    const result = importBackup(corrupt)

    expect(result.ok).toBe(false)
    expect(window.localStorage.getItem('lrpg-fit:badges')).toEqual(before)
  })

  it('rejects negative XP inside the character envelope without writing anything', () => {
    seedSampleData()
    const beforeCharacter = window.localStorage.getItem('lrpg-fit:character')
    const beforeHistory = window.localStorage.getItem('lrpg-fit:workout-history')

    const corrupt: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        'lrpg-fit:character': { state: { character: { level: 5, current_xp: -999, total_xp: 10 } }, version: 0 },
        'lrpg-fit:workout-history': [{ id: 'malicious' }],
      },
    }
    const result = importBackup(corrupt)

    expect(result.ok).toBe(false)
    // Nem a chave "boa" (workout-history) nem a "ruim" (character) devem mudar:
    // a validação roda inteira antes de qualquer escrita.
    expect(window.localStorage.getItem('lrpg-fit:character')).toEqual(beforeCharacter)
    expect(window.localStorage.getItem('lrpg-fit:workout-history')).toEqual(beforeHistory)
  })

  it('rejects a backup with a partially valid domain (good profile, corrupt history) entirely', () => {
    seedSampleData()
    const beforeHistory = window.localStorage.getItem('lrpg-fit:workout-history')

    const partial: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        'lrpg-fit:character': { state: { character: { level: 2, current_xp: 5, total_xp: 5 } }, version: 0 },
        'lrpg-fit:workout-history': { not: 'an-array' },
      },
    }
    const result = importBackup(partial)

    expect(result.ok).toBe(false)
    expect(window.localStorage.getItem('lrpg-fit:workout-history')).toEqual(beforeHistory)
  })
})

describe('importBackup and the character envelope (Hotfix 10.1)', () => {
  it('preserves a valid, already-progressed character exactly as exported', () => {
    const progressed = {
      state: { character: { level: 7, current_xp: 120, total_xp: 5000, strength: 12 } },
      version: 0,
    }
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { 'lrpg-fit:character': progressed },
    }

    const result = importBackup(payload)

    expect(result.ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('lrpg-fit:character') as string)).toEqual(progressed)
  })

  it('accepts a legacy character: null envelope instead of rejecting it (healing happens at boot, not at import)', () => {
    const legacy = { state: { character: null }, version: 0 }
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { 'lrpg-fit:character': legacy },
    }

    const result = importBackup(payload)

    // Estratégia definida: o import não rejeita nem "conserta" o character
    // null — apenas grava o que veio no backup. A recuperação para um
    // personagem válido acontece em StoreHydrationBoundary.initializeCharacter()
    // no próximo boot, o mesmo caminho usado para qualquer instalação nova.
    expect(result.ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('lrpg-fit:character') as string)).toEqual(legacy)
  })
})

describe('Sprint 12 — PR metadata round-trip', () => {
  it('preserves new optional ExerciseRecord PR fields through export -> reset -> import', () => {
    const historyWithPrFields = [
      {
        id: 'w1',
        workoutId: 'wt-1',
        workoutName: 'Peito',
        workoutColor: '#000',
        category: 'strength',
        startedAt: '2026-07-10T00:00:00.000Z',
        completedAt: '2026-07-10T00:00:00.000Z',
        durationSeconds: 1800,
        xpEarned: 100,
        prsCount: 1,
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseName: 'Supino',
            sets: [{ weight_kg: 50, reps: 8, isPr: true }],
            isWeightPr: true,
            isRepsPr: false,
            isVolumePr: true,
            isFirstTime: false,
            estimated1RMKg: 63.3,
          },
        ],
      },
    ]
    window.localStorage.setItem('lrpg-fit:workout-history', JSON.stringify(historyWithPrFields))

    const payload = exportBackup()
    resetAllData()
    const result = importBackup(payload)

    expect(result.ok).toBe(true)
    const restored = JSON.parse(window.localStorage.getItem('lrpg-fit:workout-history') as string)
    expect(restored).toEqual(historyWithPrFields)
  })

  it('still validates and imports an old-format history entry missing the new PR fields', () => {
    const legacyHistory = [
      {
        id: 'w-legacy',
        workoutId: 'wt-1',
        workoutName: 'Costas',
        workoutColor: '#000',
        category: 'strength',
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:00.000Z',
        durationSeconds: 900,
        xpEarned: 50,
        prsCount: 0,
        exercises: [
          { exerciseId: 'ex-2', exerciseName: 'Remada', sets: [{ weight_kg: 30, reps: 10, isPr: false }] },
        ],
      },
    ]
    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: { 'lrpg-fit:workout-history': legacyHistory },
    }

    const result = importBackup(payload)

    expect(result.ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('lrpg-fit:workout-history') as string)).toEqual(legacyHistory)
  })
})

describe('Sprint 17.1 — cycle reviews & week annotations round-trip', () => {
  it('preserves reviews and week annotations through export -> reset -> import', () => {
    seedSampleData()
    const payload = exportBackup()
    resetAllData()
    const result = importBackup(payload)

    expect(result.ok).toBe(true)
    expect(result.restoredKeys).toContain('lrpg-fit:cycle-reviews')
    expect(result.restoredKeys).toContain('lrpg-fit:cycle-week-annotations')
    expect(JSON.parse(window.localStorage.getItem('lrpg-fit:cycle-reviews') as string)).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem('lrpg-fit:cycle-week-annotations') as string)).toHaveLength(1)
  })

  it('imports a Sprint 17 backup that predates reviews/annotations without error', () => {
    const legacyPayload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        'lrpg-fit:training-cycles': [
          {
            id: 'cycle-legacy', name: 'Bloco antigo', goal: 'strength', startDate: '2026-05-01',
            status: 'completed', createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
    }

    const result = importBackup(legacyPayload)

    expect(result.ok).toBe(true)
    expect(result.restoredKeys).toContain('lrpg-fit:training-cycles')
    expect(result.skippedKeys).toContain('lrpg-fit:cycle-reviews')
    expect(result.skippedKeys).toContain('lrpg-fit:cycle-week-annotations')
  })

  it('rejects a backup with malformed cycle-reviews data (not an array)', () => {
    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: { 'lrpg-fit:cycle-reviews': { not: 'an array' } },
    }

    const result = importBackup(payload)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('cycle-reviews')
  })
})

describe('Sprint 18 — training goals & milestones round-trip', () => {
  it('preserves goals and milestones through export -> reset -> import', () => {
    seedSampleData()
    const payload = exportBackup()
    resetAllData()
    const result = importBackup(payload)

    expect(result.ok).toBe(true)
    expect(result.restoredKeys).toContain('lrpg-fit:training-goals')
    expect(result.restoredKeys).toContain('lrpg-fit:goal-milestones')
    expect(JSON.parse(window.localStorage.getItem('lrpg-fit:training-goals') as string)).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem('lrpg-fit:goal-milestones') as string)).toHaveLength(1)
  })

  it('imports a Sprint 17.1 backup that predates goals/milestones without error', () => {
    const legacyPayload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        'lrpg-fit:training-cycles': [
          {
            id: 'cycle-legacy', name: 'Bloco antigo', goal: 'strength', startDate: '2026-05-01',
            status: 'completed', createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
    }

    const result = importBackup(legacyPayload)

    expect(result.ok).toBe(true)
    expect(result.restoredKeys).toContain('lrpg-fit:training-cycles')
    expect(result.skippedKeys).toContain('lrpg-fit:training-goals')
    expect(result.skippedKeys).toContain('lrpg-fit:goal-milestones')
  })

  it('rejects a backup with malformed training-goals data (not an array)', () => {
    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: { 'lrpg-fit:training-goals': { not: 'an array' } },
    }

    const result = importBackup(payload)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('training-goals')
  })
})

describe('resetAllData', () => {
  it('removes every known storage key and leaves nothing behind', () => {
    seedSampleData()
    resetAllData()
    for (const key of STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull()
    }
  })
})
