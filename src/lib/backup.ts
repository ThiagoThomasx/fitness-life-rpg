export const BACKUP_VERSION = 1

export const STORAGE_KEYS = [
  'lrpg-fit:character',
  'lrpg-fit:active-session',
  'lrpg-fit:workout-history',
  'lrpg-fit:badges',
  'lrpg-fit:daily-logs',
  'lrpg-fit:reward-events',
  'lrpg-fit:nutrition-goal',
  'lrpg-fit:nutrition-logs',
  'lrpg-fit:missions-completed',
  'lrpg-fit:custom-workouts',
  'lrpg-fit:custom-exercises',
  'lrpg-fit:weekly-plan',
  'lrpg-fit:campaigns',
  'lrpg-fit:preferences',
  'lrpg-fit:avatar',
  'lrpg-fit:char-name',
  'rpg_last_seen_level',
  'lrpg-fit:readiness-check-ins',
  'lrpg-fit:session-plan-changes',
  'lrpg-fit:training-cycles',
  'lrpg-fit:cycle-reviews',
  'lrpg-fit:cycle-week-annotations',
] as const

export type StorageKey = typeof STORAGE_KEYS[number]

export interface BackupPayload {
  version: number
  exportedAt: string
  data: Partial<Record<StorageKey, unknown>>
}

export interface StorageStatus {
  usedBytes: number
  usedKB: string
  itemCount: number
  keys: { key: StorageKey; bytes: number }[]
}

function safeParseJSON(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function exportBackup(): BackupPayload {
  const data: Partial<Record<StorageKey, unknown>> = {}
  for (const key of STORAGE_KEYS) {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    if (raw !== null) {
      data[key] = safeParseJSON(raw)
    }
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function downloadBackup(): void {
  const payload = exportBackup()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `life-rpg-backup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  ok: boolean
  error?: string
  restoredKeys: string[]
  skippedKeys: string[]
}

export function validateBackupPayload(raw: unknown): raw is BackupPayload {
  if (typeof raw !== 'object' || raw === null) return false
  const b = raw as Record<string, unknown>
  if (typeof b.version !== 'number') return false
  if (typeof b.exportedAt !== 'string') return false
  if (typeof b.data !== 'object' || b.data === null) return false
  return true
}

// Chaves cujo valor persistido deve ser um array (histórico, badges, logs).
const ARRAY_KEYS: ReadonlySet<StorageKey> = new Set<StorageKey>([
  'lrpg-fit:workout-history',
  'lrpg-fit:badges',
  'lrpg-fit:daily-logs',
  'lrpg-fit:reward-events',
  'lrpg-fit:nutrition-logs',
  'lrpg-fit:custom-workouts',
  'lrpg-fit:custom-exercises',
  'lrpg-fit:readiness-check-ins',
  'lrpg-fit:session-plan-changes',
  'lrpg-fit:training-cycles',
  'lrpg-fit:cycle-reviews',
  'lrpg-fit:cycle-week-annotations',
])

// Chaves cujo valor persistido deve ser um objeto (inclui o envelope
// `{ state, version }` que o middleware `persist` do Zustand grava).
const OBJECT_KEYS: ReadonlySet<StorageKey> = new Set<StorageKey>([
  'lrpg-fit:character',
  'lrpg-fit:active-session',
  'lrpg-fit:nutrition-goal',
  'lrpg-fit:missions-completed',
  'lrpg-fit:weekly-plan',
  'lrpg-fit:campaigns',
  'lrpg-fit:preferences',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isJsonSerializable(value: unknown): boolean {
  try {
    JSON.stringify(value)
    return true
  } catch {
    return false
  }
}

/**
 * Validação estrutural mínima por chave (Etapa 3 da Sprint 10): não modela o
 * schema completo de cada domínio, mas rejeita as inversões de tipo mais
 * perigosas (array virando string, XP/nível negativo ou não numérico) antes
 * de qualquer escrita em localStorage.
 */
function validateKeyValue(key: StorageKey, value: unknown): boolean {
  if (ARRAY_KEYS.has(key)) return Array.isArray(value)

  if (OBJECT_KEYS.has(key)) {
    if (!isPlainObject(value)) return false

    if (key === 'lrpg-fit:character' || key === 'lrpg-fit:active-session') {
      const state = (value as Record<string, unknown>).state
      if (state === undefined) return true // formato legado sem envelope
      if (!isPlainObject(state)) return false
      const character = state.character
      if (character !== undefined && character !== null) {
        if (!isPlainObject(character)) return false
        for (const field of ['level', 'current_xp', 'total_xp'] as const) {
          if (field in character && !isNonNegativeFiniteNumber(character[field])) return false
        }
      }
    }
    return true
  }

  // avatar, char-name, rpg_last_seen_level: valores livres (string/number).
  return true
}

export function importBackup(payload: BackupPayload): ImportResult {
  if (!validateBackupPayload(payload)) {
    return { ok: false, error: 'Arquivo inválido ou corrompido.', restoredKeys: [], skippedKeys: [] }
  }

  if (payload.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Versão do backup (${payload.version}) é mais nova que o app suporta (${BACKUP_VERSION}).`,
      restoredKeys: [],
      skippedKeys: [],
    }
  }

  const data = payload.data as Record<string, unknown>

  // Valida TUDO antes de escrever qualquer coisa: garante atomicidade — um
  // backup parcialmente corrompido não deve alterar nenhum dado existente.
  for (const key of STORAGE_KEYS) {
    const value = data[key]
    if (value === undefined || value === null) continue
    if (!isJsonSerializable(value) || !validateKeyValue(key, value)) {
      return {
        ok: false,
        error: `Backup contém dados inválidos em "${key}". Nenhum dado foi alterado.`,
        restoredKeys: [],
        skippedKeys: [],
      }
    }
  }

  // Snapshot do estado atual: permite reverter tudo se uma escrita falhar no
  // meio (ex.: quota do localStorage excedida), preservando atomicidade.
  const snapshot = new Map<StorageKey, string | null>()
  for (const key of STORAGE_KEYS) {
    snapshot.set(key, window.localStorage.getItem(key))
  }

  const restoredKeys: string[] = []
  const skippedKeys: string[] = []

  try {
    for (const key of STORAGE_KEYS) {
      const value = data[key]
      if (value !== undefined && value !== null) {
        window.localStorage.setItem(key, JSON.stringify(value))
        restoredKeys.push(key)
      } else {
        skippedKeys.push(key)
      }
    }
  } catch {
    snapshot.forEach((raw, key) => {
      if (raw === null) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, raw)
      }
    })
    return {
      ok: false,
      error: 'Falha ao salvar o backup (armazenamento cheio ou indisponível). Nenhum dado foi alterado.',
      restoredKeys: [],
      skippedKeys: [],
    }
  }

  return { ok: true, restoredKeys, skippedKeys }
}

export function parseBackupFile(text: string): BackupPayload | null {
  try {
    const parsed = JSON.parse(text)
    if (!validateBackupPayload(parsed)) return null
    return parsed as BackupPayload
  } catch {
    return null
  }
}

export function resetAllData(): void {
  if (typeof window === 'undefined') return
  for (const key of STORAGE_KEYS) {
    window.localStorage.removeItem(key)
  }
}

export function getStorageStatus(): StorageStatus {
  if (typeof window === 'undefined') {
    return { usedBytes: 0, usedKB: '0', itemCount: 0, keys: [] }
  }

  const keys: { key: StorageKey; bytes: number }[] = []
  let total = 0

  for (const key of STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key)
    const bytes = raw ? new TextEncoder().encode(raw).length : 0
    keys.push({ key, bytes })
    total += bytes
  }

  return {
    usedBytes: total,
    usedKB: (total / 1024).toFixed(1),
    itemCount: keys.filter((k) => k.bytes > 0).length,
    keys,
  }
}
