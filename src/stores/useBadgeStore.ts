import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getEarnedBadges, type EarnedBadge } from '@/lib/badges'

interface BadgeState {
  earnedBadges: EarnedBadge[]
}

interface BadgeActions {
  refreshBadges: () => void
}

export const useBadgeStore = create<BadgeState & BadgeActions>()(
  devtools(
    (set) => ({
      earnedBadges: [],

      refreshBadges: () => {
        set({ earnedBadges: getEarnedBadges() }, false, 'badges/refresh')
      },
    }),
    { name: 'BadgeStore' }
  )
)
