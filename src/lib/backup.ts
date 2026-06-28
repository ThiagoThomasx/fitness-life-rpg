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
  'lrpg-fit:weekly-plan',
  'lrpg-fit:campaigns',
  'lrpg-fit:preferences',
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

  const restoredKeys: string[] = []
  const skippedKeys: string[] = []

  for (const key of STORAGE_KEYS) {
    const value = (payload.data as Record<string, unknown>)[key]
    if (value !== undefined && value !== null) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
        restoredKeys.push(key)
      } catch {
        skippedKeys.push(key)
      }
    } else {
      skippedKeys.push(key)
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
