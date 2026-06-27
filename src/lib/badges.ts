export interface BadgeDef {
  id: string
  name: string
  description: string
  icon: string
  requirementType:
    | 'workout_count'
    | 'pr_count'
    | 'level'
    | 'diary_count'
    | 'attribute_value'
  requirementValue: number
  requirementAttribute?: 'strength' | 'agility' | 'dexterity' | 'constitution' | 'vitality'
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  // Workout milestones
  {
    id: 'badge-first-workout',
    name: 'Primeiro Passo',
    description: 'Complete seu primeiro treino',
    icon: '🥇',
    requirementType: 'workout_count',
    requirementValue: 1,
  },
  {
    id: 'badge-10-workouts',
    name: 'Consistente',
    description: 'Complete 10 treinos',
    icon: '💪',
    requirementType: 'workout_count',
    requirementValue: 10,
  },
  {
    id: 'badge-30-workouts',
    name: 'Dedicado',
    description: 'Complete 30 treinos',
    icon: '🔥',
    requirementType: 'workout_count',
    requirementValue: 30,
  },
  {
    id: 'badge-50-workouts',
    name: 'Veterano',
    description: 'Complete 50 treinos',
    icon: '⚡',
    requirementType: 'workout_count',
    requirementValue: 50,
  },
  // PR milestones
  {
    id: 'badge-first-pr',
    name: 'Recorde Pessoal',
    description: 'Bata seu primeiro recorde pessoal',
    icon: '🏆',
    requirementType: 'pr_count',
    requirementValue: 1,
  },
  {
    id: 'badge-5-prs',
    name: 'Quebrando Barreiras',
    description: 'Acumule 5 recordes pessoais',
    icon: '🎯',
    requirementType: 'pr_count',
    requirementValue: 5,
  },
  {
    id: 'badge-15-prs',
    name: 'Máquina',
    description: 'Acumule 15 recordes pessoais',
    icon: '🤖',
    requirementType: 'pr_count',
    requirementValue: 15,
  },
  // Level milestones
  {
    id: 'badge-level-2',
    name: 'Iniciado',
    description: 'Alcance o nível 2',
    icon: '⬆️',
    requirementType: 'level',
    requirementValue: 2,
  },
  {
    id: 'badge-level-5',
    name: 'Guerreiro',
    description: 'Alcance o nível 5',
    icon: '⚔️',
    requirementType: 'level',
    requirementValue: 5,
  },
  {
    id: 'badge-level-10',
    name: 'Lendário',
    description: 'Alcance o nível 10',
    icon: '👑',
    requirementType: 'level',
    requirementValue: 10,
  },
  // Diary milestones
  {
    id: 'badge-first-diary',
    name: 'Cronista',
    description: 'Escreva sua primeira entrada no diário',
    icon: '📓',
    requirementType: 'diary_count',
    requirementValue: 1,
  },
  {
    id: 'badge-7-diary',
    name: 'Reflexivo',
    description: 'Escreva 7 entradas no diário',
    icon: '🧠',
    requirementType: 'diary_count',
    requirementValue: 7,
  },
  {
    id: 'badge-30-diary',
    name: 'Escritor',
    description: 'Escreva 30 entradas no diário',
    icon: '✍️',
    requirementType: 'diary_count',
    requirementValue: 30,
  },
  // Attribute milestones
  {
    id: 'badge-strength-15',
    name: 'Força Bruta',
    description: 'Alcance 15 pontos de Força',
    icon: '🦾',
    requirementType: 'attribute_value',
    requirementValue: 15,
    requirementAttribute: 'strength',
  },
  {
    id: 'badge-agility-15',
    name: 'Velocista',
    description: 'Alcance 15 pontos de Agilidade',
    icon: '🌪️',
    requirementType: 'attribute_value',
    requirementValue: 15,
    requirementAttribute: 'agility',
  },
  {
    id: 'badge-dexterity-15',
    name: 'Preciso',
    description: 'Alcance 15 pontos de Destreza',
    icon: '🎯',
    requirementType: 'attribute_value',
    requirementValue: 15,
    requirementAttribute: 'dexterity',
  },
  {
    id: 'badge-constitution-15',
    name: 'Resistente',
    description: 'Alcance 15 pontos de Constituição',
    icon: '🛡️',
    requirementType: 'attribute_value',
    requirementValue: 15,
    requirementAttribute: 'constitution',
  },
  {
    id: 'badge-vitality-15',
    name: 'Vitalício',
    description: 'Alcance 15 pontos de Vitalidade',
    icon: '❤️‍🔥',
    requirementType: 'attribute_value',
    requirementValue: 15,
    requirementAttribute: 'vitality',
  },
]

export interface EarnedBadge {
  badgeId: string
  earnedAt: string
}

const STORAGE_KEY = 'lrpg-fit:badges'

function safeGet(): EarnedBadge[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as EarnedBadge[]) : []
  } catch {
    return []
  }
}

function safeSet(badges: EarnedBadge[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(badges))
  } catch {}
}

export function getEarnedBadges(): EarnedBadge[] {
  return safeGet()
}

export function hasBadge(badgeId: string): boolean {
  return safeGet().some((b) => b.badgeId === badgeId)
}

export function earnBadge(badgeId: string): EarnedBadge | null {
  if (hasBadge(badgeId)) return null
  const badge: EarnedBadge = { badgeId, earnedAt: new Date().toISOString() }
  safeSet([...safeGet(), badge])
  return badge
}

export interface BadgeCheckContext {
  workoutCount: number
  totalPrs: number
  level: number
  diaryCount: number
  strength: number
  agility: number
  dexterity: number
  constitution: number
  vitality: number
}

export function checkAndEarnBadges(ctx: BadgeCheckContext): BadgeDef[] {
  const newlyEarned: BadgeDef[] = []

  for (const badge of BADGE_DEFINITIONS) {
    if (hasBadge(badge.id)) continue

    let qualified = false

    switch (badge.requirementType) {
      case 'workout_count':
        qualified = ctx.workoutCount >= badge.requirementValue
        break
      case 'pr_count':
        qualified = ctx.totalPrs >= badge.requirementValue
        break
      case 'level':
        qualified = ctx.level >= badge.requirementValue
        break
      case 'diary_count':
        qualified = ctx.diaryCount >= badge.requirementValue
        break
      case 'attribute_value': {
        const attrKey = badge.requirementAttribute
        if (attrKey) {
          qualified = Math.floor(ctx[attrKey]) >= badge.requirementValue
        }
        break
      }
    }

    if (qualified) {
      earnBadge(badge.id)
      newlyEarned.push(badge)
    }
  }

  return newlyEarned
}
