import type { Campaign, CampaignType, CampaignStatus } from '@/types/planning'
import { getWorkoutHistory } from './workout-history'

const STORAGE_KEY = 'lrpg-fit:campaigns'

export interface CampaignTemplate {
  type: CampaignType
  name: string
  description: string
  icon: string
  targetValue: number
  unit: string
  durationDays: number | null
  xpReward: number
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    type: 'lose_weight',
    name: 'Perder Peso',
    description: 'Complete 20 treinos focados em cardio e queima calórica',
    icon: '🔥',
    targetValue: 20,
    unit: 'treinos',
    durationDays: 60,
    xpReward: 500,
  },
  {
    type: 'gain_consistency',
    name: 'Ganhar Consistência',
    description: 'Treine por 30 dias dentro de um período de 6 semanas',
    icon: '📅',
    targetValue: 30,
    unit: 'treinos',
    durationDays: 42,
    xpReward: 400,
  },
  {
    type: 'improve_strength',
    name: 'Melhorar Força',
    description: 'Complete 25 treinos de força e acumule recordes pessoais',
    icon: '💪',
    targetValue: 25,
    unit: 'treinos de força',
    durationDays: 90,
    xpReward: 450,
  },
  {
    type: '30_days_workout',
    name: '30 Dias de Treino',
    description: 'Treine por 30 dias consecutivos',
    icon: '⚡',
    targetValue: 30,
    unit: 'dias',
    durationDays: 30,
    xpReward: 600,
  },
  {
    type: '12_weeks_routine',
    name: '12 Semanas de Rotina',
    description: 'Mantenha uma rotina semanal por 12 semanas completas',
    icon: '🏆',
    targetValue: 12,
    unit: 'semanas',
    durationDays: 84,
    xpReward: 1000,
  },
  {
    type: 'custom',
    name: 'Campanha Personalizada',
    description: 'Defina seu próprio objetivo',
    icon: '🎯',
    targetValue: 10,
    unit: 'treinos',
    durationDays: null,
    xpReward: 300,
  },
]

function safeGet(): Campaign[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Campaign[]) : []
  } catch {
    return []
  }
}

function safeSet(campaigns: Campaign[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
  } catch {}
}

export function getCampaigns(): Campaign[] {
  return safeGet()
}

export function getActiveCampaigns(): Campaign[] {
  return safeGet().filter((c) => c.status === 'active')
}

export function createCampaign(
  type: CampaignType,
  overrides: Partial<Pick<Campaign, 'name' | 'description' | 'icon' | 'targetValue' | 'unit' | 'endDate' | 'xpReward'>> = {}
): Campaign {
  const template = CAMPAIGN_TEMPLATES.find((t) => t.type === type) ?? CAMPAIGN_TEMPLATES[0]
  const now = new Date()
  const endDate = template.durationDays
    ? new Date(now.getTime() + template.durationDays * 86400000).toISOString().slice(0, 10)
    : null

  const campaign: Campaign = {
    id: `campaign-${Date.now()}`,
    name: overrides.name ?? template.name,
    type,
    description: overrides.description ?? template.description,
    icon: overrides.icon ?? template.icon,
    targetValue: overrides.targetValue ?? template.targetValue,
    currentValue: 0,
    unit: overrides.unit ?? template.unit,
    startDate: now.toISOString().slice(0, 10),
    endDate: overrides.endDate ?? endDate,
    status: 'active' as CampaignStatus,
    xpReward: overrides.xpReward ?? template.xpReward,
    createdAt: now.toISOString(),
  }

  const campaigns = safeGet()
  safeSet([...campaigns, campaign])
  return campaign
}

export function updateCampaignProgress(campaignId: string, currentValue: number): Campaign | null {
  const campaigns = safeGet()
  const idx = campaigns.findIndex((c) => c.id === campaignId)
  if (idx === -1) return null

  const campaign = campaigns[idx]
  const updated: Campaign = {
    ...campaign,
    currentValue,
    status: currentValue >= campaign.targetValue ? 'completed' : campaign.status,
  }
  const newList = [...campaigns.slice(0, idx), updated, ...campaigns.slice(idx + 1)]
  safeSet(newList)
  return updated
}

export function abandonCampaign(campaignId: string): void {
  const campaigns = safeGet()
  const updated = campaigns.map((c) =>
    c.id === campaignId ? { ...c, status: 'abandoned' as CampaignStatus } : c
  )
  safeSet(updated)
}

export function deleteCampaign(campaignId: string): void {
  safeSet(safeGet().filter((c) => c.id !== campaignId))
}

export function syncCampaignProgress(): Campaign[] {
  const campaigns = safeGet()
  if (!campaigns.length) return campaigns

  const workoutHistory = getWorkoutHistory()

  const updated = campaigns.map((campaign) => {
    if (campaign.status !== 'active') return campaign

    let currentValue = campaign.currentValue

    switch (campaign.type) {
      case 'lose_weight': {
        const cardioWorkouts = workoutHistory.filter(
          (w) => w.category === 'cardio' && w.completedAt >= campaign.startDate
        ).length
        currentValue = cardioWorkouts
        break
      }
      case 'gain_consistency':
      case 'improve_strength':
      case '30_days_workout': {
        const workoutsAfterStart = workoutHistory.filter(
          (w) => w.completedAt >= campaign.startDate
        ).length
        currentValue = workoutsAfterStart
        break
      }
      case '12_weeks_routine': {
        const weeksWithWorkout = countWeeksWithWorkout(workoutHistory, campaign.startDate)
        currentValue = weeksWithWorkout
        break
      }
      case 'custom':
        break
    }

    const isComplete = currentValue >= campaign.targetValue
    return {
      ...campaign,
      currentValue,
      status: isComplete ? ('completed' as CampaignStatus) : campaign.status,
    }
  })

  safeSet(updated)
  return updated
}

function countWeeksWithWorkout(
  history: ReturnType<typeof getWorkoutHistory>,
  startDate: string
): number {
  const weekStarts = new Set<string>()
  for (const w of history) {
    if (w.completedAt < startDate) continue
    const d = new Date(w.completedAt)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    weekStarts.add(d.toISOString().slice(0, 10))
  }
  return weekStarts.size
}

