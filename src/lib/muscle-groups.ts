export type MuscleGroup = 'peito' | 'costas' | 'pernas' | 'ombros' | 'biceps' | 'triceps' | 'core'

export const RECOVERY_HOURS: Record<MuscleGroup, number> = {
  peito: 72,
  costas: 72,
  pernas: 96,
  ombros: 48,
  biceps: 48,
  triceps: 48,
  core: 24,
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  peito: 'Peito',
  costas: 'Costas',
  pernas: 'Pernas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  core: 'Core',
}

// Termos livres observados em src/lib/mock/data.ts. Termos ausentes daqui (ex.:
// "corpo todo", "cardiovascular", "pescoço") não representam um grupo com
// recuperação limitada nesta v1 e são ignorados por normalizeMuscleGroups.
const MUSCLE_GROUP_ALIASES: Record<string, MuscleGroup> = {
  'peitoral': 'peito',
  'peitoral superior': 'peito',
  'costas': 'costas',
  'costas media': 'costas',
  'latissimo': 'costas',
  'lombar': 'costas',
  'coluna': 'costas',
  'quadriceps': 'pernas',
  'gluteos': 'pernas',
  'isquiotibiais': 'pernas',
  'panturrilhas': 'pernas',
  'quadril': 'pernas',
  'pernas': 'pernas',
  'ombros': 'ombros',
  'deltoide lateral': 'ombros',
  'biceps': 'biceps',
  'braquial': 'biceps',
  'triceps': 'triceps',
  'core': 'core',
  'abdomen': 'core',
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeKey(rawTerm: string): string {
  return stripAccents(rawTerm.trim().toLowerCase())
}

export function normalizeMuscleGroups(rawGroups: string[]): MuscleGroup[] {
  const resolved = new Set<MuscleGroup>()
  for (const raw of rawGroups) {
    const canonical = MUSCLE_GROUP_ALIASES[normalizeKey(raw)]
    if (canonical) resolved.add(canonical)
  }
  return Array.from(resolved)
}
