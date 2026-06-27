import type { Character } from '@/types/database'

type AttributeKey = 'strength' | 'agility' | 'dexterity' | 'constitution' | 'vitality'

interface AttributeGain {
  attribute: AttributeKey
  amount: number
}

const CATEGORY_GAINS: Record<string, AttributeGain[]> = {
  strength: [
    { attribute: 'strength', amount: 0.4 },
    { attribute: 'constitution', amount: 0.2 },
  ],
  cardio: [
    { attribute: 'agility', amount: 0.3 },
    { attribute: 'vitality', amount: 0.3 },
  ],
  agility: [
    { attribute: 'agility', amount: 0.3 },
    { attribute: 'dexterity', amount: 0.3 },
  ],
  flexibility: [
    { attribute: 'dexterity', amount: 0.4 },
    { attribute: 'vitality', amount: 0.2 },
  ],
  dexterity: [
    { attribute: 'dexterity', amount: 0.4 },
    { attribute: 'agility', amount: 0.2 },
  ],
}

export interface AttributeGainResult {
  updated: Partial<Pick<Character, AttributeKey>>
  gained: Array<{ attribute: AttributeKey; label: string; before: number; after: number; leveledUp: boolean }>
}

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength: 'Força',
  agility: 'Agilidade',
  dexterity: 'Destreza',
  constitution: 'Constituição',
  vitality: 'Vitalidade',
}

export function calculateAttributeGains(
  character: Character,
  category: string
): AttributeGainResult {
  const gains = CATEGORY_GAINS[category] ?? []
  const updated: Partial<Pick<Character, AttributeKey>> = {}
  const gained: AttributeGainResult['gained'] = []

  for (const gain of gains) {
    const before = character[gain.attribute] as number
    const after = before + gain.amount
    updated[gain.attribute] = after
    gained.push({
      attribute: gain.attribute,
      label: ATTRIBUTE_LABELS[gain.attribute],
      before,
      after,
      leveledUp: Math.floor(after) > Math.floor(before),
    })
  }

  return { updated, gained }
}
